import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { customDomain, link } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import type { WorkerBindings } from '#/server/env'
import { createTestDatabase } from '#/server/testing/sqlite'
import { Bindings } from '#/server/effect/services/bindings'
import { Db } from '#/server/effect/services/db'
import { hashLinkPassword } from '#/server/links/password'
import { normalizeHost, resolveRedirect } from './resolve'
import { outcomeToResponse } from './response'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup(options: { analyticsFails?: boolean } = {}) {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const writeDataPoint = mock(() => {
    if (options.analyticsFails) throw new Error('analytics down')
  })
  const bindings = { ANALYTICS: { writeDataPoint } } as unknown as WorkerBindings
  const now = new Date()
  adapter.insert(customDomain).values({
    id: 'd1', organizationId: 'o1', hostname: 'go.example.com', readiness: 'active',
    provider: 'memory', createdAt: now, updatedAt: now,
  }).run()
  adapter.insert(customDomain).values({
    id: 'd2', organizationId: 'o1', hostname: 'pending.example.com', readiness: 'pending',
    provider: 'memory', createdAt: now, updatedAt: now,
  }).run()
  const seed = (overrides: Partial<typeof link.$inferInsert> = {}) =>
    adapter.insert(link).values({
      id: crypto.randomUUID(), organizationId: 'o1', domainId: 'd1', slug: 'abc',
      destinationUrl: 'https://example.com/dest', createdAt: now, updatedAt: now, ...overrides,
    }).returning().get()
  const resolve = (input: { host: string; slug: string; password?: string }) =>
    Effect.runPromise(
      resolveRedirect(input).pipe(
        Effect.provideService(Db, db),
        Effect.provideService(Bindings, bindings),
      ),
    )
  const clicks = (id: string) =>
    adapter.select().from(link).where(eq(link.id, id)).get()!.clickCount
  return { seed, resolve, clicks, writeDataPoint }
}

describe('normalizeHost', () => {
  test('lowercases and strips port and trailing dot', () => {
    expect(normalizeHost('Go.Example.COM:8787')).toBe('go.example.com')
    expect(normalizeHost('go.example.com.')).toBe('go.example.com')
  })
})

describe('resolveRedirect', () => {
  test('redirects, counts the click and records analytics', async () => {
    const t = setup()
    const row = t.seed()
    const outcome = await t.resolve({ host: 'GO.example.com:3000', slug: 'abc' })
    expect(outcome).toEqual({ type: 'redirect', url: 'https://example.com/dest', status: 302, countsClick: true })
    expect(t.clicks(row.id)).toBe(1)
    expect(t.writeDataPoint).toHaveBeenCalledTimes(1)
  })

  test('unknown host, inactive domain and unknown slug are not found', async () => {
    const t = setup()
    t.seed()
    t.seed({ domainId: 'd2', slug: 'abc' })
    expect(await t.resolve({ host: 'nope.example.com', slug: 'abc' })).toEqual({ type: 'not_found' })
    expect(await t.resolve({ host: 'pending.example.com', slug: 'abc' })).toEqual({ type: 'not_found' })
    expect(await t.resolve({ host: 'go.example.com', slug: 'missing' })).toEqual({ type: 'not_found' })
  })

  test('slugs are scoped to their domain', async () => {
    const t = setup()
    t.seed({ domainId: 'd2', slug: 'only-on-pending' })
    expect(await t.resolve({ host: 'go.example.com', slug: 'only-on-pending' })).toEqual({ type: 'not_found' })
  })

  test('an analytics failure does not block the redirect', async () => {
    const t = setup({ analyticsFails: true })
    const row = t.seed()
    expect(await t.resolve({ host: 'go.example.com', slug: 'abc' })).toMatchObject({ type: 'redirect' })
    expect(t.clicks(row.id)).toBe(1)
  })

  test('inactive links do not count clicks', async () => {
    const t = setup()
    const row = t.seed({ status: 'paused', fallbackDestinationUrl: 'https://example.com/later' })
    expect(await t.resolve({ host: 'go.example.com', slug: 'abc' })).toMatchObject({
      url: 'https://example.com/later',
    })
    expect(t.clicks(row.id)).toBe(0)
    expect(t.writeDataPoint).not.toHaveBeenCalled()
  })

  test('the click limit is enforced and never exceeded', async () => {
    const t = setup()
    const row = t.seed({ maxClicks: 2 })
    const results = []
    for (let i = 0; i < 4; i += 1) results.push(await t.resolve({ host: 'go.example.com', slug: 'abc' }))
    expect(results.map((r) => r.type)).toEqual(['redirect', 'redirect', 'gone', 'gone'])
    expect(t.clicks(row.id)).toBe(2)
  })

  test('password protected links require the right password', async () => {
    const t = setup()
    const row = t.seed({ passwordHash: await Effect.runPromise(hashLinkPassword('s3cret')) })
    expect(await t.resolve({ host: 'go.example.com', slug: 'abc' })).toEqual({ type: 'password_required' })
    expect(await t.resolve({ host: 'go.example.com', slug: 'abc', password: 'wrong' })).toEqual({
      type: 'password_invalid',
    })
    expect(t.clicks(row.id)).toBe(0)
    expect(await t.resolve({ host: 'go.example.com', slug: 'abc', password: 's3cret' })).toMatchObject({
      type: 'redirect',
    })
    expect(t.clicks(row.id)).toBe(1)
  })
})

describe('outcomeToResponse', () => {
  test('maps outcomes to HTTP responses', async () => {
    const redirect = outcomeToResponse({ type: 'redirect', url: 'https://a.test/', status: 301, countsClick: true })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('location')).toBe('https://a.test/')
    expect(outcomeToResponse({ type: 'not_found' }).status).toBe(404)
    expect(outcomeToResponse({ type: 'gone' }).status).toBe(410)
    const form = outcomeToResponse({ type: 'password_invalid' })
    expect(form.status).toBe(401)
    expect(await form.text()).toContain('Incorrect password')
  })
})
