import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { customDomain, link } from '@openlink/db/schema'
import { Effect, Exit } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { DomainLinks } from './domain-links'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

const NOW = new Date('2026-11-16T00:00:00Z')

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const domain = (id: string, organizationId: string, readiness: 'active' | 'pending' = 'active') =>
    adapter
      .insert(customDomain)
      .values({ id, organizationId, hostname: `${id}.example.com`, readiness, provider: 'memory', createdAt: NOW, updatedAt: NOW })
      .run()
  let n = 0
  const linkOn = (domainId: string | null, slug: string, organizationId = 'o1') =>
    adapter
      .insert(link)
      .values({ id: `l${n++}`, organizationId, domainId, slug, destinationUrl: 'https://e.test', createdAt: NOW, updatedAt: NOW })
      .run()
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const exit = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromiseExit(effect.pipe(Effect.provideService(Db, db)))
  const domainOf = (slug: string) => sqlite.query('SELECT domain_id AS d FROM link WHERE slug = ? ORDER BY id').all(slug)
  return { domain, linkOn, run, exit, domainOf }
}

describe('DomainLinks', () => {
  test('counts links per domain, for this workspace only', async () => {
    const t = setup()
    t.domain('d1', 'o1')
    t.domain('d2', 'o1')
    t.linkOn('d1', 'a')
    t.linkOn('d1', 'b')
    t.linkOn('d2', 'c')
    t.linkOn(null, 'home')
    const counts = await t.run(DomainLinks.counts('o1'))
    expect(Object.fromEntries(counts)).toEqual({ d1: 2, d2: 1 })
    expect(await t.run(DomainLinks.countFor('o2', 'd1'))).toBe(0)
  })

  test('moves every link to another active domain, keeping back-halves', async () => {
    const t = setup()
    t.domain('from', 'o1')
    t.domain('to', 'o1')
    t.linkOn('from', 'launch')
    t.linkOn('from', 'docs')
    t.linkOn('to', 'other')
    expect(await t.run(DomainLinks.moveAll({ organizationId: 'o1', fromDomainId: 'from', to: 'to' }))).toBe(2)
    expect(t.domainOf('launch')).toEqual([{ d: 'to' }])
    expect(Object.fromEntries(await t.run(DomainLinks.counts('o1')))).toEqual({ to: 3 })
  })

  test('moves to the app host, which shares back-halves across workspaces', async () => {
    const t = setup()
    t.domain('from', 'o1')
    t.linkOn('from', 'launch')
    t.linkOn(null, 'taken', 'o2')
    t.linkOn('from', 'taken')
    const clash = await t.exit(DomainLinks.moveAll({ organizationId: 'o1', fromDomainId: 'from', to: null }))
    expect(Exit.isFailure(clash)).toBe(true)
    expect(JSON.stringify(clash)).toContain('DomainLinksConflict')
    expect(JSON.stringify(clash)).toContain('taken')
    // Nothing moved.
    expect(t.domainOf('launch')).toEqual([{ d: 'from' }])
  })

  test('refuses the same domain, another workspace’s domain, and one that is not active', async () => {
    const t = setup()
    t.domain('from', 'o1')
    t.domain('pending', 'o1', 'pending')
    t.domain('theirs', 'o2')
    t.linkOn('from', 'launch')
    for (const to of ['from', 'pending', 'theirs', 'missing']) {
      const result = await t.exit(DomainLinks.moveAll({ organizationId: 'o1', fromDomainId: 'from', to }))
      expect(JSON.stringify(result)).toContain('DomainMoveTargetInvalid')
    }
    expect(t.domainOf('launch')).toEqual([{ d: 'from' }])
  })

  test('a domain with no links moves nothing', async () => {
    const t = setup()
    t.domain('from', 'o1')
    t.domain('to', 'o1')
    expect(await t.run(DomainLinks.moveAll({ organizationId: 'o1', fromDomainId: 'from', to: 'to' }))).toBe(0)
  })
})
