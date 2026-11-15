import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { link, linkFolder } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { FolderNameTaken, FolderNotFound, FolderRuleViolation } from './errors'
import { MAX_FOLDER_DEPTH } from './rules'
import { createFolder, deleteFolder, ensureFolderInOrganization, listFolders, updateFolder } from './service'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase({ foreignKeys: false })
  databases.push(sqlite)
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const fail = <A, E>(effect: Effect.Effect<A, E, Db>) =>
    Effect.runPromise(effect.pipe(Effect.provideService(Db, db), Effect.flip))
  const make = (name: string, parentId: string | null = null, organizationId = 'o1') =>
    run(createFolder({ organizationId, name, parentId }))
  const seedLink = (folderId: string | null, slug = crypto.randomUUID()) => {
    const now = new Date()
    return adapter
      .insert(link)
      .values({ id: crypto.randomUUID(), organizationId: 'o1', domainId: 'd1', slug, folderId, destinationUrl: 'https://e.test', createdAt: now, updatedAt: now })
      .returning()
      .get()
  }
  const linkFolderOf = (id: string) => adapter.select().from(link).where(eq(link.id, id)).get()?.folderId
  const folderNames = () => adapter.select().from(linkFolder).all().map((f) => f.name).sort()
  return { run, fail, make, seedLink, linkFolderOf, folderNames, adapter }
}

describe('createFolder', () => {
  test('creates root and nested folders, trimming the name', async () => {
    const t = setup()
    const root = await t.make('  Docs ')
    const child = await t.make('Guides', root.id)
    expect(root).toMatchObject({ name: 'Docs', parentId: null })
    expect(child.parentId).toBe(root.id)
  })

  test('rejects invalid names, unknown parents, parents in another organization and clashes', async () => {
    const t = setup()
    const root = await t.make('Docs')
    expect(await t.fail(createFolder({ organizationId: 'o1', name: '  ' }))).toBeInstanceOf(FolderRuleViolation)
    expect(await t.fail(createFolder({ organizationId: 'o1', name: 'x', parentId: 'ghost' }))).toBeInstanceOf(FolderNotFound)
    expect(await t.fail(createFolder({ organizationId: 'o2', name: 'x', parentId: root.id }))).toBeInstanceOf(FolderNotFound)
    expect(await t.fail(createFolder({ organizationId: 'o1', name: 'docs' }))).toBeInstanceOf(FolderNameTaken)
    expect((await t.run(createFolder({ organizationId: 'o2', name: 'Docs' }))).organizationId).toBe('o2')
  })

  test('enforces the depth limit', async () => {
    const t = setup()
    let parent: string | null = null
    for (let i = 0; i < MAX_FOLDER_DEPTH; i += 1) parent = (await t.make(`n${i}`, parent)).id
    expect(await t.fail(createFolder({ organizationId: 'o1', name: 'too deep', parentId: parent }))).toBeInstanceOf(FolderRuleViolation)
  })
})

describe('updateFolder', () => {
  test('renames and moves between parents and to the root', async () => {
    const t = setup()
    const a = await t.make('A')
    const b = await t.make('B')
    const moved = await t.run(updateFolder({ organizationId: 'o1', folderId: b.id, name: 'B2', parentId: a.id }))
    expect(moved).toMatchObject({ name: 'B2', parentId: a.id })
    const back = await t.run(updateFolder({ organizationId: 'o1', folderId: b.id, parentId: null }))
    expect(back.parentId).toBeNull()
  })

  test('rejects cycles, clashes, and cross-organization access', async () => {
    const t = setup()
    const a = await t.make('A')
    const b = await t.make('B', a.id)
    await t.make('B')
    expect(await t.fail(updateFolder({ organizationId: 'o1', folderId: a.id, parentId: b.id }))).toBeInstanceOf(FolderRuleViolation)
    expect(await t.fail(updateFolder({ organizationId: 'o1', folderId: b.id, parentId: null }))).toBeInstanceOf(FolderNameTaken)
    expect(await t.fail(updateFolder({ organizationId: 'o2', folderId: a.id, name: 'x' }))).toBeInstanceOf(FolderNotFound)
  })

  test('renaming to its own name is not a clash', async () => {
    const t = setup()
    const a = await t.make('A')
    expect((await t.run(updateFolder({ organizationId: 'o1', folderId: a.id, name: 'a' }))).name).toBe('a')
  })
})

describe('deleteFolder', () => {
  test('move-up re-parents child folders and links, renaming clashes', async () => {
    const t = setup()
    const docs = await t.make('Docs')
    const guides = await t.make('Guides', docs.id)
    await t.make('Guides') // sibling of Docs at the root; will clash after move-up
    const inDocs = t.seedLink(docs.id)
    const inGuides = t.seedLink(guides.id)
    await t.run(deleteFolder({ organizationId: 'o1', folderId: docs.id, mode: 'move-up' }))
    expect(t.folderNames()).toEqual(['Guides', 'Guides (2)'])
    expect(t.linkFolderOf(inDocs.id)).toBeNull()
    expect(t.linkFolderOf(inGuides.id)).toBe(guides.id)
    expect((await t.run(listFolders('o1'))).find((f) => f.id === guides.id)?.parentId).toBeNull()
  })

  test('move-up is the default and links move to the parent folder', async () => {
    const t = setup()
    const a = await t.make('A')
    const b = await t.make('B', a.id)
    const l = t.seedLink(b.id)
    const deleted = await t.run(deleteFolder({ organizationId: 'o1', folderId: b.id }))
    expect(deleted).toMatchObject({ id: b.id, name: 'B' })
    expect(t.linkFolderOf(l.id)).toBe(a.id)
  })

  test('cascade removes the subtree and only its links', async () => {
    const t = setup()
    const a = await t.make('A')
    const b = await t.make('B', a.id)
    const other = await t.make('Other')
    const doomed = [t.seedLink(a.id), t.seedLink(b.id)]
    const safe = [t.seedLink(other.id), t.seedLink(null)]
    await t.run(deleteFolder({ organizationId: 'o1', folderId: a.id, mode: 'cascade' }))
    expect(t.folderNames()).toEqual(['Other'])
    expect(t.adapter.select().from(link).all().map((l) => l.id).sort()).toEqual(safe.map((l) => l.id).sort())
    expect(doomed).toHaveLength(2)
  })

  test('cascade handles subtrees larger than one statement chunk', async () => {
    const t = setup()
    const root = await t.make('Root')
    for (let i = 0; i < 150; i += 1) await t.make(`child-${i}`, root.id)
    await t.run(deleteFolder({ organizationId: 'o1', folderId: root.id, mode: 'cascade' }))
    expect(t.folderNames()).toEqual([])
  })

  test('unknown or foreign folders are not found', async () => {
    const t = setup()
    const a = await t.make('A')
    expect(await t.fail(deleteFolder({ organizationId: 'o2', folderId: a.id }))).toBeInstanceOf(FolderNotFound)
    expect(t.folderNames()).toEqual(['A'])
  })
})

describe('ensureFolderInOrganization', () => {
  test('finds folders only within their organization', async () => {
    const t = setup()
    const a = await t.make('A')
    expect((await t.run(ensureFolderInOrganization('o1', a.id))).id).toBe(a.id)
    expect(await t.fail(ensureFolderInOrganization('o2', a.id))).toBeInstanceOf(FolderNotFound)
  })
})
