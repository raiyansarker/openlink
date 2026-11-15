import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { link } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { addTagsToLinks, deleteLinks, moveLinks } from './bulk'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  let n = 0
  const seed = (overrides: Partial<typeof link.$inferInsert> = {}) => {
    n += 1
    const now = new Date()
    return adapter
      .insert(link)
      .values({ id: `l${n}`, organizationId: 'o1', domainId: 'd1', slug: `s${n}`, destinationUrl: 'https://e.test', createdAt: now, updatedAt: now, ...overrides })
      .returning()
      .get()
  }
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const get = (id: string) => adapter.select().from(link).where(eq(link.id, id)).get()
  return { seed, run, get, adapter }
}

describe('bulk link operations', () => {
  test('moveLinks moves only links of the workspace and reports the count', async () => {
    const t = setup()
    const mine = t.seed()
    const theirs = t.seed({ organizationId: 'o2' })
    const affected = await t.run(moveLinks({ organizationId: 'o1', linkIds: [mine.id, theirs.id, 'ghost', mine.id], folderId: 'f1' }))
    expect(affected).toBe(1)
    expect(t.get(mine.id)?.folderId).toBe('f1')
    expect(t.get(theirs.id)?.folderId).toBeNull()
    await t.run(moveLinks({ organizationId: 'o1', linkIds: [mine.id], folderId: null }))
    expect(t.get(mine.id)?.folderId).toBeNull()
  })

  test('deleteLinks deletes only links of the workspace', async () => {
    const t = setup()
    const mine = t.seed()
    const theirs = t.seed({ organizationId: 'o2' })
    expect(await t.run(deleteLinks({ organizationId: 'o1', linkIds: [mine.id, theirs.id] }))).toBe(1)
    expect(t.get(mine.id)).toBeUndefined()
    expect(t.get(theirs.id)).toBeDefined()
  })

  test('addTagsToLinks merges tags per link and leaves other workspaces alone', async () => {
    const t = setup()
    const a = t.seed({ tagsJson: '["keep"]' })
    const b = t.seed({ tagsJson: '[]' })
    const foreign = t.seed({ organizationId: 'o2', tagsJson: '[]' })
    const affected = await t.run(addTagsToLinks({ organizationId: 'o1', linkIds: [a.id, b.id, foreign.id], tags: [' New ', 'keep'] }))
    expect(affected).toBe(2)
    expect(JSON.parse(t.get(a.id)!.tagsJson)).toEqual(['keep', 'New'])
    expect(JSON.parse(t.get(b.id)!.tagsJson)).toEqual(['New', 'keep'])
    expect(t.get(foreign.id)!.tagsJson).toBe('[]')
  })

  test('handles more ids than fit in one D1 statement', async () => {
    const t = setup()
    const ids = Array.from({ length: 200 }, () => t.seed().id)
    expect(await t.run(moveLinks({ organizationId: 'o1', linkIds: ids, folderId: 'big' }))).toBe(200)
    expect(await t.run(deleteLinks({ organizationId: 'o1', linkIds: ids }))).toBe(200)
  })
})
