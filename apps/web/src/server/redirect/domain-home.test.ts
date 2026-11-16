import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { customDomain } from '@openlink/db/schema'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { DomainHome } from './domain-home'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date()
  for (const [id, hostname, readiness] of [['d1', 'go.brand.com', 'active'], ['d2', 'new.brand.com', 'pending']] as const) {
    adapter.insert(customDomain).values({ id, organizationId: 'o1', hostname, readiness, provider: 'memory', createdAt: now, updatedAt: now }).run()
  }
  return (host: string) =>
    Effect.runPromise(DomainHome.respond({ host, appOrigin: 'https://openlink.app' }).pipe(Effect.provideService(Db, db)))
}

describe('DomainHome', () => {
  test('the app host renders the app', async () => {
    const home = setup()
    expect(await home('openlink.app')).toBeNull()
    expect(await home('OpenLink.app:443')).toBeNull()
  })

  test('an active custom domain shows its vanity page, linking to OpenLink', async () => {
    const home = setup()
    const response = (await home('Go.Brand.com'))!
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('<h1>go.brand.com</h1>')
    expect(html).toContain('href="https://openlink.app"')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
  })

  test('pending and unknown hosts get the plain 404, with no way into the app', async () => {
    const home = setup()
    for (const host of ['new.brand.com', 'random.example.com']) {
      const response = (await home(host))!
      expect(response.status).toBe(404)
      expect(await response.text()).not.toContain('openlink.app')
    }
  })
})
