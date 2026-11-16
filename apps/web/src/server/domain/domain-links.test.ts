import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { customDomain, link } from '@openlink/db/schema'
import { Effect } from 'effect'

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
  return { domain, linkOn, run }
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
})
