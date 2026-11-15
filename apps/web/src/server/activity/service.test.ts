import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { activityEvent } from '@openlink/db/schema'
import { Effect } from 'effect'

import { BackendError } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import {
  decodeCursor,
  encodeCursor,
  listActivity,
  recordActivity,
  recordActivityQuietly,
} from './service'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

const member = { type: 'member', userId: 'u1', label: 'Ada' } as const

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const record = (overrides: Partial<Parameters<typeof recordActivity>[0]> = {}) =>
    run(recordActivity({ organizationId: 'o1', actor: member, action: 'link.created', target: { type: 'link', id: 'l1', label: 'launch' }, ...overrides }))
  return { run, record, adapter, db }
}

describe('recordActivity', () => {
  test('stores the catalog category, snapshots labels and serialises changes', async () => {
    const t = setup()
    await t.record({
      action: 'domain.added',
      target: { type: 'domain', id: 'd1', label: 'go.example.com' },
      changes: [{ label: 'Hostname', from: '—', to: 'go.example.com' }],
      source: 'api',
      ipAddress: '203.0.113.1',
    })
    const [row] = t.adapter.select().from(activityEvent).all()
    expect(row).toMatchObject({
      organizationId: 'o1', actorType: 'member', actorUserId: 'u1', actorLabel: 'Ada',
      action: 'domain.added', category: 'domains', targetType: 'domain', targetId: 'd1',
      targetLabel: 'go.example.com', source: 'api', ipAddress: '203.0.113.1',
    })
    expect(JSON.parse(row!.detailsJson!)).toEqual({ changes: [{ label: 'Hostname', from: '—', to: 'go.example.com' }] })
  })

  test('non-member actors have no user id, and empty changes store nothing', async () => {
    const t = setup()
    await t.record({ actor: { type: 'system', label: 'OpenLink' }, changes: [] })
    const [row] = t.adapter.select().from(activityEvent).all()
    expect(row).toMatchObject({ actorType: 'system', actorUserId: null, detailsJson: null })
  })
})

describe('recordActivityQuietly', () => {
  test('swallows write failures so the user action still succeeds', async () => {
    const t = setup()
    t.adapter.$client.exec('DROP TABLE activity_event')
    const result = await t.run(
      recordActivityQuietly({ organizationId: 'o1', actor: member, action: 'link.created', target: { type: 'link', label: 'x' } }),
    )
    expect(result).toBeUndefined()
  })

  test('the loud variant exposes a typed failure', async () => {
    const t = setup()
    t.adapter.$client.exec('DROP TABLE activity_event')
    const error = await Effect.runPromise(
      recordActivity({ organizationId: 'o1', actor: member, action: 'link.created', target: { type: 'link', label: 'x' } }).pipe(
        Effect.provideService(Db, t.db),
        Effect.flip,
      ),
    )
    expect(error).toBeInstanceOf(BackendError)
    expect(error.operation).toBe('activity.record')
  })
})

describe('listActivity', () => {
  test('is newest first, scoped to the organization, and filters by category and target', async () => {
    const t = setup()
    for (let i = 0; i < 3; i += 1) {
      await t.record({ target: { type: 'link', id: `l${i}`, label: `l${i}` } })
      await new Promise((resolve) => setTimeout(resolve, 2))
    }
    await t.record({ action: 'domain.added', target: { type: 'domain', id: 'd1', label: 'd' } })
    await t.record({ organizationId: 'o2' })
    const all = await t.run(listActivity({ organizationId: 'o1' }))
    expect(all.items).toHaveLength(4)
    expect(all.items[0]!.action).toBe('domain.added')
    expect((await t.run(listActivity({ organizationId: 'o1', category: 'links' }))).items).toHaveLength(3)
    const forTarget = await t.run(listActivity({ organizationId: 'o1', target: { type: 'link', id: 'l1' } }))
    expect(forTarget.items.map((r) => r.targetId)).toEqual(['l1'])
  })

  test('pages through events without gaps or repeats, including identical timestamps', async () => {
    const t = setup()
    const at = new Date('2026-01-01T00:00:00Z')
    for (let i = 0; i < 7; i += 1) {
      t.adapter.insert(activityEvent).values({
        id: `e${i}`, organizationId: 'o1', actorType: 'system', actorLabel: 'sys', action: 'link.created',
        category: 'links', targetType: 'link', targetLabel: 'x', source: 'dashboard', createdAt: i < 4 ? at : new Date(at.getTime() + 1000),
      }).run()
    }
    const seen: string[] = []
    let cursor: string | undefined
    let pages = 0
    do {
      const page = await t.run(listActivity({ organizationId: 'o1', limit: 3, cursor }))
      seen.push(...page.items.map((r) => r.id))
      cursor = page.nextCursor
      pages += 1
    } while (cursor)
    expect(pages).toBe(3)
    expect(new Set(seen).size).toBe(7)
    expect(seen).toHaveLength(7)
  })

  test('cursors round trip, and bad cursors are ignored', () => {
    const cursor = encodeCursor({ createdAt: new Date(5000), id: 'a:b' })
    expect(decodeCursor(cursor)).toEqual({ at: new Date(5000), id: 'a:b' })
    expect(decodeCursor('garbage')).toBeNull()
    expect(decodeCursor(':x')).toBeNull()
    expect(decodeCursor(undefined)).toBeNull()
  })
})
