import { describe, expect, test } from 'bun:test'
import * as schema from '@openlink/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createTestDatabase } from '../testing/sqlite'
import { authRateLimit } from './rate-limits'

/** Two Better Auth instances on one database, like two Worker isolates sharing D1. */
function setup() {
  const { db } = createTestDatabase()
  const make = () =>
    betterAuth({
      baseURL: 'http://localhost',
      secret: 'test-secret-that-is-at-least-32-characters-long',
      database: drizzleAdapter(db as never, {
        provider: 'sqlite',
        schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
      }),
      emailAndPassword: { enabled: true, sendResetPassword: async () => {} },
      rateLimit: authRateLimit(() => db),
      advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
      logger: { disabled: true },
    })
  const post = (auth: ReturnType<typeof make>, path: string, body: object, ip: string) =>
    auth.handler(
      new Request(`http://localhost/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost', 'cf-connecting-ip': ip },
        body: JSON.stringify(body),
      }),
    )
  return { first: make(), second: make(), post }
}

describe('authRateLimit', () => {
  test('password reset requests are limited per IP, across instances', async () => {
    const { first, second, post } = setup()
    const reset = { email: 'ada@example.com' }
    const statuses = [
      (await post(first, '/request-password-reset', reset, '203.0.113.9')).status,
      (await post(second, '/request-password-reset', reset, '203.0.113.9')).status,
      (await post(first, '/request-password-reset', reset, '203.0.113.9')).status,
      (await post(second, '/request-password-reset', reset, '198.51.100.1')).status,
    ]
    expect(statuses).toEqual([200, 200, 429, 200])
  })

  test('a refused request says when to retry', async () => {
    const { first, post } = setup()
    for (let i = 0; i < 2; i++) await post(first, '/send-verification-email', { email: 'ada@example.com' }, '203.0.113.9')
    const refused = await post(first, '/send-verification-email', { email: 'ada@example.com' }, '203.0.113.9')
    expect(refused.status).toBe(429)
    expect(Number(refused.headers.get('x-retry-after'))).toBeGreaterThan(0)
  })
})
