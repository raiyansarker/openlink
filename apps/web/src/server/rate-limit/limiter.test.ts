import { describe, expect, test } from 'bun:test'
import { createTestDatabase } from '../testing/sqlite'
import { clientIp, RateLimiter } from './limiter'

const MINUTE_RULE = { window: 60, max: 1 }
const HOUR_RULE = { window: 3600, max: 3 }

function setup(start = Date.UTC(2026, 0, 1, 12, 0, 10)) {
  const { db, sqlite } = createTestDatabase()
  const clock = { now: start }
  const limiter = new RateLimiter(() => db, () => clock.now)
  return { limiter, sqlite, clock }
}

describe('RateLimiter', () => {
  test('allows up to the limit, then refuses until the window ends', async () => {
    const { limiter, clock } = setup()
    const limits = [{ key: 'k', rules: [MINUTE_RULE] }]
    expect((await limiter.consume(limits)).allowed).toBe(true)
    const refused = await limiter.consume(limits)
    expect(refused).toEqual({ allowed: false, retryAfter: 50, exceeded: ['k'] })
    clock.now += 50_000
    expect((await limiter.consume(limits)).allowed).toBe(true)
  })

  test('every rule must pass, and refused attempts still count', async () => {
    const { limiter, clock } = setup()
    const limits = [{ key: 'k', rules: [MINUTE_RULE, HOUR_RULE] }]
    const allowed: boolean[] = []
    for (let i = 0; i < 4; i++) {
      allowed.push((await limiter.consume(limits)).allowed)
      clock.now += 61_000
    }
    // One per minute passes three times; the fourth, still inside the hour, is over the hourly 3.
    expect(allowed).toEqual([true, true, true, false])
  })

  test('reports every key that is over its limit', async () => {
    const { limiter } = setup()
    const limits = [
      { key: 'a', rules: [MINUTE_RULE] },
      { key: 'b', rules: [{ window: 60, max: 5 }] },
    ]
    await limiter.consume(limits)
    expect((await limiter.consume(limits)).exceeded).toEqual(['a'])
  })

  test('stores only a hash of the key', async () => {
    const { limiter, sqlite } = setup()
    await limiter.consume([{ key: 'email:any:to:person@example.com', rules: [MINUTE_RULE] }])
    const rows = sqlite.query('select key from rate_limit').all() as { key: string }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].key).toMatch(/^[0-9a-f]{64}:60$/)
    expect(rows[0].key).not.toContain('person')
  })

  test('prune drops ended windows only', async () => {
    const { limiter, sqlite, clock } = setup()
    await limiter.consume([{ key: 'short', rules: [MINUTE_RULE] }, { key: 'long', rules: [HOUR_RULE] }])
    clock.now += 120_000
    await limiter.prune()
    expect((sqlite.query('select count(*) as count from rate_limit').get() as { count: number }).count).toBe(1)
  })

  test('a request with an older clock counts toward the newer window instead of resetting it', async () => {
    const { limiter, clock } = setup()
    const limits = [{ key: 'k', rules: [MINUTE_RULE] }]
    await limiter.consume(limits)
    clock.now -= 60_000
    expect((await limiter.consume(limits)).allowed).toBe(false)
  })

  test('no limits is always allowed', async () => {
    const { limiter } = setup()
    expect(await limiter.consume([])).toEqual({ allowed: true, retryAfter: null, exceeded: [] })
  })
})

describe('clientIp', () => {
  test('reads the address Cloudflare saw', () => {
    expect(clientIp(new Request('http://x', { headers: { 'cf-connecting-ip': ' 203.0.113.9 ' } }))).toBe('203.0.113.9')
    expect(clientIp(new Request('http://x'))).toBeNull()
    expect(clientIp(undefined)).toBeNull()
  })
})
