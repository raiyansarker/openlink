import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { link } from '@openlink/db/schema'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { queryOrganizationLinks, type LinkStatusFilter } from './queries'
import { deriveLinkStatus } from './rules'

const NOW = new Date('2026-06-01T00:00:00Z')
const past = new Date('2026-01-01T00:00:00Z')
const future = new Date('2027-01-01T00:00:00Z')

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
    return adapter
      .insert(link)
      .values({
        id: `l${String(n).padStart(3, '0')}`,
        organizationId: 'o1',
        domainId: 'd1',
        slug: `slug-${n}`,
        destinationUrl: `https://example.com/${n}`,
        createdAt: new Date(NOW.getTime() + n * 1000),
        updatedAt: NOW,
        ...overrides,
      })
      .returning()
      .get()
  }
  const query = (input: Omit<Parameters<typeof queryOrganizationLinks>[0], 'organizationId' | 'now'> & { organizationId?: string }) =>
    Effect.runPromise(
      queryOrganizationLinks({ organizationId: 'o1', now: NOW, ...input }).pipe(Effect.provideService(Db, db)),
    )
  return { seed, query }
}

describe('status filter matches deriveLinkStatus', () => {
  const statuses = ['draft', 'scheduled', 'active', 'paused', 'expired', 'disabled'] as const
  const variants: Partial<typeof link.$inferInsert>[] = []
  for (const status of statuses) {
    for (const enabled of [true, false]) {
      for (const activateAt of [null, past, future]) {
        for (const expiresAt of [null, past, future]) {
          for (const [maxClicks, clickCount] of [[null, 0], [5, 2], [5, 5]] as const) {
            variants.push({ status, enabled, activateAt, expiresAt, maxClicks, clickCount })
          }
        }
      }
    }
  }

  test('every combination is returned by exactly the filter for its derived status', async () => {
    const t = setup()
    const rows = variants.map((v) => t.seed(v))
    expect(rows.length).toBe(6 * 2 * 3 * 3 * 3)
    for (const status of statuses) {
      const expected = rows.filter((r) => deriveLinkStatus(r, NOW) === status).map((r) => r.id).sort()
      const { items, total } = await t.query({ status: status as LinkStatusFilter, limit: 200 })
      expect(items.map((r) => r.id).sort()).toEqual(expected.slice(0, 200).sort())
      expect(total).toBe(expected.length)
    }
  })
})

describe('queryOrganizationLinks', () => {
  test('scopes to the organization and orders newest first', async () => {
    const t = setup()
    const a = t.seed()
    const b = t.seed()
    t.seed({ organizationId: 'o2' })
    const { items, total } = await t.query({})
    expect(items.map((r) => r.id)).toEqual([b.id, a.id])
    expect(total).toBe(2)
  })

  test('searches slug, title, destination and description, treating wildcards literally', async () => {
    const t = setup()
    const bySlug = t.seed({ slug: 'launch-day' })
    const byTitle = t.seed({ title: 'Big Launch' })
    const byUrl = t.seed({ destinationUrl: 'https://example.com/launch' })
    const byDesc = t.seed({ description: 'about the LAUNCH' })
    t.seed({ slug: 'other' })
    t.seed({ slug: '100%_real' })
    const ids = (await t.query({ q: 'launch' })).items.map((r) => r.id).sort()
    expect(ids).toEqual([bySlug.id, byTitle.id, byUrl.id, byDesc.id].sort())
    expect((await t.query({ q: '%' })).items.map((r) => r.slug)).toEqual(['100%_real'])
    expect((await t.query({ q: '_' })).items.map((r) => r.slug)).toEqual(['100%_real'])
    expect((await t.query({ q: '   ' })).total).toBe(6)
  })

  test('filters by folder, including the root', async () => {
    const t = setup()
    const inF1 = t.seed({ folderId: 'f1' })
    const root = t.seed()
    t.seed({ folderId: 'f2' })
    expect((await t.query({ folderId: 'f1' })).items.map((r) => r.id)).toEqual([inF1.id])
    expect((await t.query({ folderId: 'root' })).items.map((r) => r.id)).toEqual([root.id])
  })

  test('filters by tag exactly, not by substring', async () => {
    const t = setup()
    const hit = t.seed({ tagsJson: '["Launch","q4"]' })
    t.seed({ tagsJson: '["launches"]' })
    t.seed({ tagsJson: '[]' })
    const quoted = t.seed({ tagsJson: JSON.stringify(['say "hi"']) })
    expect((await t.query({ tag: 'launch' })).items.map((r) => r.id)).toEqual([hit.id])
    expect((await t.query({ tag: 'say "hi"' })).items.map((r) => r.id)).toEqual([quoted.id])
  })

  test('combines filters', async () => {
    const t = setup()
    const hit = t.seed({ folderId: 'f1', tagsJson: '["a"]', title: 'Hello' })
    t.seed({ folderId: 'f1', tagsJson: '["a"]', title: 'Nope' })
    t.seed({ folderId: 'f2', tagsJson: '["a"]', title: 'Hello' })
    expect((await t.query({ folderId: 'f1', tag: 'a', q: 'hello', status: 'active' })).items.map((r) => r.id)).toEqual([hit.id])
  })

  test('paginates with a stable total and clamps limits', async () => {
    const t = setup()
    for (let i = 0; i < 5; i += 1) t.seed()
    const first = await t.query({ limit: 2 })
    const second = await t.query({ limit: 2, offset: 2 })
    const last = await t.query({ limit: 2, offset: 4 })
    expect([first.items.length, second.items.length, last.items.length]).toEqual([2, 2, 1])
    expect(new Set([...first.items, ...second.items, ...last.items].map((r) => r.id)).size).toBe(5)
    expect(first.total).toBe(5)
    expect((await t.query({ limit: 0 })).items.length).toBe(1)
    expect((await t.query({ limit: 100000 })).items.length).toBe(5)
    expect((await t.query({ offset: -3 })).items.length).toBe(5)
  })
})
