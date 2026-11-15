import { link } from '@openlink/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { Effect } from 'effect'

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
export function moveLinks(input: { organizationId: string; linkIds: readonly string[]; folderId: string | null }) {
  return Effect.gen(function* () {
    const db = yield* Db
    let affected = 0
    for (const ids of chunk([...new Set(input.linkIds)])) {
      const rows = yield* operation('links.bulk.move', () =>
        db
          .update(link)
          .set({ folderId: input.folderId, updatedAt: new Date() })
          .where(inWorkspace(input.organizationId, ids))
          .returning({ id: link.id }),
      )
      affected += rows.length
    }
    return affected
  })
}

export function deleteLinks(input: { organizationId: string; linkIds: readonly string[] }) {
  return Effect.gen(function* () {
    const db = yield* Db
    let affected = 0
    for (const ids of chunk([...new Set(input.linkIds)])) {
      const rows = yield* operation('links.bulk.delete', () =>
        db.delete(link).where(inWorkspace(input.organizationId, ids)).returning({ id: link.id }),
      )
      affected += rows.length
    }
    return affected
  })
}

/** Add tags to each link, keeping the ones it already has. */
export function addTagsToLinks(input: { organizationId: string; linkIds: readonly string[]; tags: readonly string[] }) {
  return Effect.gen(function* () {
    const db = yield* Db
    let affected = 0
    for (const ids of chunk([...new Set(input.linkIds)])) {
      const rows = yield* operation('links.bulk.readTags', () =>
        db
          .select({ id: link.id, tagsJson: link.tagsJson })
          .from(link)
          .where(inWorkspace(input.organizationId, ids)),
      )
      for (const row of rows) {
        const merged = mergeTags(parseTags(row.tagsJson), input.tags)
        yield* operation('links.bulk.writeTags', () =>
          db
            .update(link)
            .set({ tagsJson: JSON.stringify(merged), updatedAt: new Date() })
            .where(eq(link.id, row.id)),
        )
        affected += 1
      }
    }
    return affected
  })
}
