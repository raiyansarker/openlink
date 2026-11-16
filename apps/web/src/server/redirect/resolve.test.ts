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
import { EventBus } from '#/server/events/bus'
import { RedirectResponses } from './response'
import { Visitor } from './visitor'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup(options: { analyticsFails?: boolean; attemptsLeft?: number } = {}) {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const writeDataPoint = mock(() => {
    if (options.analyticsFails) throw new Error('analytics down')
  })
  let attemptsLeft = options.attemptsLeft ?? Number.POSITIVE_INFINITY
  const limiter = { limit: mock(async () => ({ success: attemptsLeft-- > 0 })) }
  const bindings = {
    ANALYTICS: { writeDataPoint },
    BETTER_AUTH_SECRET: 'test-secret-that-is-long-enough',
    LINK_PASSWORD_LIMITER: limiter,
  } as unknown as WorkerBindings
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
  const resolve = (input: Parameters<typeof resolveRedirect>[0]) =>
    Effect.runPromise(
      resolveRedirect(input).pipe(
        Effect.provideService(Db, db),
        Effect.provideService(Bindings, bindings),
      ),
    )
  const rehash = (id: string, passwordHash: string) => adapter.update(link).set({ passwordHash }).where(eq(link.id, id)).run()
  const clicks = (id: string) =>
    adapter.select().from(link).where(eq(link.id, id)).get()!.clickCount
  return { seed, resolve, clicks, rehash, writeDataPoint, limiter }
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
    const accepted = await t.resolve({ host: 'go.example.com', slug: 'abc', password: 's3cret' })
    expect(accepted.type).toBe('password_accepted')
    // The click is counted when the remembered visitor reopens the link.
    expect(t.clicks(row.id)).toBe(0)
    const cookie = accepted.type === 'password_accepted' ? accepted.setCookie.split(';')[0]! : ''
    expect(await t.resolve({ host: 'go.example.com', slug: 'abc', cookieHeader: `other=1; ${cookie}` })).toMatchObject({
      type: 'redirect',
    })
    expect(t.clicks(row.id)).toBe(1)
  })

  test('a remembered password must be untampered and stops working when the password changes', async () => {
    const t = setup()
    const row = t.seed({ passwordHash: await Effect.runPromise(hashLinkPassword('one1')) })
    const accepted = await t.resolve({ host: 'go.example.com', slug: 'abc', password: 'one1' })
    const cookie = accepted.type === 'password_accepted' ? accepted.setCookie.split(';')[0]! : ''
    const tampered = cookie.slice(0, -1) + (cookie.endsWith('A') ? 'B' : 'A')
    expect(await t.resolve({ host: 'go.example.com', slug: 'abc', cookieHeader: tampered })).toEqual({ type: 'password_required' })
    expect((await t.resolve({ host: 'go.example.com', slug: 'abc', cookieHeader: cookie })).type).toBe('redirect')
    t.rehash(row.id, await Effect.runPromise(hashLinkPassword('two2')))
    expect(await t.resolve({ host: 'go.example.com', slug: 'abc', cookieHeader: cookie })).toEqual({ type: 'password_required' })
  })

  test('password guesses are capped per link and visitor', async () => {
    const t = setup({ attemptsLeft: 2 })
    t.seed({ passwordHash: await Effect.runPromise(hashLinkPassword('s3cret')) })
    const guess = (password: string) => t.resolve({ host: 'go.example.com', slug: 'abc', password, clientIp: '203.0.113.9' })
    expect((await guess('a')).type).toBe('password_invalid')
    expect((await guess('b')).type).toBe('password_invalid')
    expect((await guess('s3cret')).type).toBe('password_rate_limited')
    expect(t.limiter.limit).toHaveBeenLastCalledWith({ key: expect.stringMatching(/:203\.0\.113\.9$/) })
  })
})

describe('resolveRedirect events', () => {
  test('publishes every click, and a milestone on round counts', async () => {
    const t = setup()
    const row = t.seed({ clickCount: 99 })
    const types: string[] = []
    const off = EventBus.register({ name: 'test', deliver: (event) => Effect.sync(() => void types.push(event.type)) })
    await t.resolve({ host: 'go.example.com', slug: 'abc' })
    await t.resolve({ host: 'go.example.com', slug: 'abc' })
    off()
    expect(types).toEqual(['click.recorded', 'click.milestone', 'click.recorded'])
    expect(t.clicks(row.id)).toBe(101)
  })
})

describe('resolveRedirect cloaking', () => {
  test('frames the destination when it allows it, and redirects when it does not', async () => {
    const t = setup()
    const row = t.seed({ deliveryJson: JSON.stringify({ cloaked: true }), title: 'Docs' })
    const yes = await t.resolve({ host: 'go.example.com', slug: 'abc', frameable: () => Effect.succeed(true) })
    expect(yes).toEqual({ type: 'cloak', url: 'https://example.com/dest', title: 'Docs', countsClick: true })
    const no = await t.resolve({ host: 'go.example.com', slug: 'abc', frameable: () => Effect.succeed(false) })
    expect(no).toEqual({ type: 'redirect', url: 'https://example.com/dest', status: 302, countsClick: true })
    expect(t.clicks(row.id)).toBe(2)
  })

  test('a share card for a crawler counts no click', async () => {
    const t = setup()
    const row = t.seed({ deliveryJson: JSON.stringify({ socialPreview: { title: 'Card' } }) })
    const outcome = await t.resolve({ host: 'go.example.com', slug: 'abc', visitor: new Visitor('Twitterbot/1.0', null, null) })
    expect(outcome.type).toBe('preview')
    expect(t.clicks(row.id)).toBe(0)
  })
})

describe('RedirectResponses.for', () => {
  test('maps outcomes to HTTP responses', async () => {
    const redirect = RedirectResponses.for({ type: 'redirect', url: 'https://a.test/', status: 301, countsClick: true })
    expect(redirect.status).toBe(301)
    expect(redirect.headers.get('location')).toBe('https://a.test/')
    expect(RedirectResponses.for({ type: 'not_found' }).status).toBe(404)
    expect(RedirectResponses.for({ type: 'gone' }).status).toBe(410)
    const form = RedirectResponses.for({ type: 'password_invalid' })
    expect(form.status).toBe(401)
    expect(await form.text()).toContain('Incorrect password')
  })

  test('hold pages use their status and look like the real thing', async () => {
    const gateway = RedirectResponses.for({ type: 'hold', page: 'bad-gateway' })
    expect(gateway.status).toBe(502)
    expect(await gateway.text()).toContain('<center><h1>502 Bad Gateway</h1></center>')
    const maintenance = RedirectResponses.for({ type: 'hold', page: 'maintenance' })
    expect(maintenance.status).toBe(503)
    expect(maintenance.headers.get('retry-after')).toBe('3600')
    expect(maintenance.headers.get('cache-control')).toBe('no-store')
  })

  test('share cards carry absolute Open Graph and Twitter tags', async () => {
    const card = RedirectResponses.for(
      { type: 'preview', title: 'Launch', preview: { description: 'Big <news>', imageUrl: '/api/media/previews/o1/a.png' } },
      new URL('https://go.example.com/abc'),
    )
    const html = await card.text()
    expect(card.status).toBe(200)
    expect(html).toContain('<meta property="og:url" content="https://go.example.com/abc">')
    expect(html).toContain('<meta property="og:image" content="https://go.example.com/api/media/previews/o1/a.png">')
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(html).toContain('Big &#60;news&#62;')
  })

  test('an accepted password reopens the short link with a GET and a scoped cookie', () => {
    const accepted = RedirectResponses.for(
      { type: 'password_accepted', setCookie: 'ol_pw_l1=1.x; Path=/abc' },
      new URL('https://go.example.com/abc?ref=mail'),
    )
    expect(accepted.status).toBe(303)
    expect(accepted.headers.get('location')).toBe('/abc?ref=mail')
    expect(accepted.headers.get('set-cookie')).toBe('ol_pw_l1=1.x; Path=/abc')
    expect(RedirectResponses.for({ type: 'password_rate_limited' }).status).toBe(429)
  })

  test('cloak pages frame the destination', async () => {
    const page = RedirectResponses.for({ type: 'cloak', url: 'https://example.com/?a=1&b=2', title: 'Docs', countsClick: true })
    expect(await page.text()).toContain('<iframe src="https://example.com/?a=1&#38;b=2"')
    expect(page.headers.get('content-security-policy')).toContain('frame-src https: http:')
  })
})

describe('resolveRedirect on the app host', () => {
  test('resolves links with no custom domain, and only those', async () => {
    const t = setup()
    t.seed({ domainId: null, slug: 'launch', destinationUrl: 'https://example.com/app-host' })
    t.seed({ slug: 'only-custom', destinationUrl: 'https://example.com/custom' })
    expect(await t.resolve({ host: 'app.openlink.test', slug: 'launch', appHost: 'APP.openlink.test:443' })).toMatchObject({
      type: 'redirect', url: 'https://example.com/app-host',
    })
    expect(await t.resolve({ host: 'app.openlink.test', slug: 'only-custom', appHost: 'app.openlink.test' })).toEqual({ type: 'not_found' })
  })

  test('app-host links are not served on custom domains', async () => {
    const t = setup()
    t.seed({ domainId: null, slug: 'launch' })
    expect(await t.resolve({ host: 'go.example.com', slug: 'launch', appHost: 'app.openlink.test' })).toEqual({ type: 'not_found' })
  })
})
