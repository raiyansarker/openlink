import { link } from '@openlink/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { Effect } from 'effect'

import { writeBatch } from '#/server/effect/batch'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { mergeTags, parseTags } from './tags'

/** D1 allows 100 bound parameters per statement; one slot is the organization id. */
const ID_CHUNK = 80
const chunk = <T>(items: readonly T[], size = ID_CHUNK) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))

const inWorkspace = (organizationId: string, ids: readonly string[]) =>
  and(eq(link.organizationId, organizationId), inArray(link.id, ids as string[]))

/** Move links to a folder (null = root). Ids from other workspaces are ignored. */
/** Rows touched across a batch of `.returning()` statements. */
const countRows = (results: readonly unknown[]) =>
  results.reduce<number>((sum, rows) => sum + (rows as readonly unknown[]).length, 0)

export function moveLinks(input: { organizationId: string; linkIds: readonly string[]; folderId: string | null }) {
  return Effect.gen(function* () {
    const db = yield* Db
    const now = new Date()
    // One batch across every chunk: all the links move, or none do.
    const results = yield* writeBatch(
      'links.bulk.move',
      chunk([...new Set(input.linkIds)]).map((ids) =>
        db
          .update(link)
          .set({ folderId: input.folderId, updatedAt: now })
          .where(inWorkspace(input.organizationId, ids))
          .returning({ id: link.id }),
      ),
    )
    return countRows(results)
  })
}

export function deleteLinks(input: { organizationId: string; linkIds: readonly string[] }) {
  return Effect.gen(function* () {
    const db = yield* Db
    // One batch across every chunk: all the links are deleted, or none are.
    const results = yield* writeBatch(
      'links.bulk.delete',
      chunk([...new Set(input.linkIds)]).map((ids) =>
        db.delete(link).where(inWorkspace(input.organizationId, ids)).returning({ id: link.id }),
      ),
    )
    return countRows(results)
  })
}

/** Add tags to each link, keeping the ones it already has. */
export function addTagsToLinks(input: { organizationId: string; linkIds: readonly string[]; tags: readonly string[] }) {
  return Effect.gen(function* () {
    const db = yield* Db
    const rows: { id: string; tagsJson: string }[] = []
    for (const ids of chunk([...new Set(input.linkIds)])) {
      rows.push(
        ...(yield* operation('links.bulk.readTags', () =>
          db
            .select({ id: link.id, tagsJson: link.tagsJson })
            .from(link)
            .where(inWorkspace(input.organizationId, ids)),
        )),
      )
    }
    const now = new Date()
    // Every link's tags are written in one batch, so a failure leaves all of them unchanged.
    yield* writeBatch(
      'links.bulk.writeTags',
      rows.map((row) =>
        db
          .update(link)
          .set({ tagsJson: JSON.stringify(mergeTags(parseTags(row.tagsJson), input.tags)), updatedAt: now })
          .where(eq(link.id, row.id)),
      ),
    )
    return rows.length
  })
}
