import { link, linkFolder } from '@openlink/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { Effect } from 'effect'

import { writeBatch } from '#/server/effect/batch'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { FolderNameTaken, FolderNotFound, FolderRuleViolation } from './errors'
import {
  canCreateFolderIn,
  canMoveFolder,
  descendantIds,
  hasNameClash,
  normalizeFolderName,
  uniqueSiblingName,
} from './rules'

export type FolderRow = typeof linkFolder.$inferSelect

/** D1 allows 100 bound parameters per statement; stay well below it. */
const ID_CHUNK = 80
const chunk = <T>(items: T[], size = ID_CHUNK) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

export function listFolders(organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    return yield* operation('folders.list', () =>
      db
        .select()
        .from(linkFolder)
        .where(eq(linkFolder.organizationId, organizationId))
        .orderBy(linkFolder.createdAt),
    )
  })
}

const requireFolder = (folders: FolderRow[], folderId: string) => {
  const found = folders.find((f) => f.id === folderId)
  return found ? Effect.succeed(found) : Effect.fail(new FolderNotFound())
}

const requireValidName = (name: string) => {
  const result = normalizeFolderName(name)
  return result.ok ? Effect.succeed(result.name) : Effect.fail(new FolderRuleViolation({ message: result.message }))
}

/** A folder must belong to the same organization as the link or folder referencing it. */
export function ensureFolderInOrganization(organizationId: string, folderId: string) {
  return Effect.gen(function* () {
    const folders = yield* listFolders(organizationId)
    return yield* requireFolder(folders, folderId)
  })
}

export function createFolder(input: { organizationId: string; name: string; parentId?: string | null }) {
  return Effect.gen(function* () {
    const parentId = input.parentId ?? null
    const name = yield* requireValidName(input.name)
    const folders = yield* listFolders(input.organizationId)
    if (parentId) yield* requireFolder(folders, parentId)
    if (!canCreateFolderIn(folders, parentId)) {
      return yield* Effect.fail(new FolderRuleViolation({ message: 'Folders can only be nested 10 levels deep.' }))
    }
    if (hasNameClash(folders, name, parentId)) return yield* Effect.fail(new FolderNameTaken())

    const db = yield* Db
    const now = new Date()
    const [row] = yield* operation('folders.create', () =>
      db
        .insert(linkFolder)
        .values({ id: crypto.randomUUID(), organizationId: input.organizationId, parentId, name, createdAt: now, updatedAt: now })
        .returning(),
    )
    return row!
  })
}

export function updateFolder(input: {
  organizationId: string
  folderId: string
  name?: string
  parentId?: string | null
}) {
  return Effect.gen(function* () {
    const folders = yield* listFolders(input.organizationId)
    const current = yield* requireFolder(folders, input.folderId)
    const name = input.name === undefined ? current.name : yield* requireValidName(input.name)
    const parentId = input.parentId === undefined ? current.parentId : input.parentId

    if (parentId !== current.parentId) {
      if (parentId) yield* requireFolder(folders, parentId)
      if (!canMoveFolder(folders, current.id, parentId)) {
        return yield* Effect.fail(
          new FolderRuleViolation({ message: 'That folder cannot be moved there.' }),
        )
      }
    }
    if (hasNameClash(folders, name, parentId, current.id)) return yield* Effect.fail(new FolderNameTaken())

    const db = yield* Db
    const [row] = yield* operation('folders.update', () =>
      db
        .update(linkFolder)
        .set({ name, parentId, updatedAt: new Date() })
        .where(and(eq(linkFolder.id, current.id), eq(linkFolder.organizationId, input.organizationId)))
        .returning(),
    )
    return row!
  })
}

/**
 * `move-up` hands child folders and links to the deleted folder's parent
 * (renaming children that would clash). `cascade` removes the whole subtree and
 * its links; links go first so a partial failure never orphans data silently.
 */
export function deleteFolder(input: {
  organizationId: string
  folderId: string
  mode?: 'move-up' | 'cascade'
}) {
  return Effect.gen(function* () {
    const db = yield* Db
    const folders = yield* listFolders(input.organizationId)
    const target = yield* requireFolder(folders, input.folderId)

    // Each mode is one batch: the folder tree and its links change together, or not at all.
    if (input.mode === 'cascade') {
      const doomed = [target.id, ...descendantIds(folders, target.id)]
      yield* writeBatch('folders.deleteCascade', [
        ...chunk(doomed).map((ids) => db.delete(link).where(inArray(link.folderId, ids))),
        ...chunk(doomed).map((ids) => db.delete(linkFolder).where(inArray(linkFolder.id, ids))),
      ])
      return target
    }

    const taken = new Set(
      folders.filter((f) => f.parentId === target.parentId && f.id !== target.id).map((f) => f.name.toLowerCase()),
    )
    const now = new Date()
    const moveChildren = folders
      .filter((f) => f.parentId === target.id)
      .map((child) => {
        const name = uniqueSiblingName(taken, child.name)
        taken.add(name.toLowerCase())
        return db.update(linkFolder).set({ parentId: target.parentId, name, updatedAt: now }).where(eq(linkFolder.id, child.id))
      })
    yield* writeBatch('folders.deleteMoveUp', [
      ...moveChildren,
      db.update(link).set({ folderId: target.parentId }).where(eq(link.folderId, target.id)),
      db.delete(linkFolder).where(eq(linkFolder.id, target.id)),
    ])
    return target
  })
}
