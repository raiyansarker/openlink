import { describe, expect, test } from 'bun:test'
import * as schema from '@openlink/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createTestDatabase } from '../testing/sqlite'
import { composeEmail } from './compose'

const env = { BETTER_AUTH_URL: 'http://localhost', BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long' }

/** A real Better Auth on the same database, so the links composeEmail builds are checked by Better Auth itself. */
function setup() {
  const { db } = createTestDatabase()
  const auth = betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db as never, {
      provider: 'sqlite',
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: { enabled: true, requireEmailVerification: true, sendResetPassword: async () => {} },
    emailVerification: { sendOnSignUp: true, sendVerificationEmail: async () => {} },
    logger: { disabled: true },
  })
  const post = (path: string, body: object) =>
    auth.handler(new Request(`http://localhost/api/auth${path}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify(body) }))
  return { db, auth, post }
}

const link = (email: Awaited<ReturnType<typeof composeEmail>>, key: string) =>
  typeof email === 'string' ? '' : (email.message.props as Record<string, string>)[key]

describe('composeEmail links, checked by Better Auth', () => {
  test('the verification link verifies the address', async () => {
    const { db, auth, post } = setup()
    const signUp = (await (await post('/sign-up/email', { email: 'ada@example.com', password: 'password-1234', name: 'Ada' })).json()) as { user: { id: string } }
    const email = await composeEmail(db, env, { type: 'email-verification', userId: signUp.user.id })
    const response = await auth.handler(new Request(link(email, 'verifyUrl')))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/verify-email')
    const [row] = await db.select({ verified: schema.user.emailVerified }).from(schema.user)
    expect(row.verified).toBe(true)
  })

  test('the reset link opens the reset page with a token that resets the password', async () => {
    const { db, auth, post } = setup()
    const signUp = (await (await post('/sign-up/email', { email: 'ada@example.com', password: 'password-1234', name: 'Ada' })).json()) as { user: { id: string } }
    await post('/request-password-reset', { email: 'ada@example.com', redirectTo: '/reset-password' })
    const email = await composeEmail(db, env, { type: 'password-reset', userId: signUp.user.id })
    const opened = await auth.handler(new Request(link(email, 'resetUrl')))
    expect(opened.status).toBe(302)
    const location = new URL(opened.headers.get('location')!, 'http://localhost')
    expect(location.pathname).toBe('/reset-password')
    const reset = await post('/reset-password', { token: location.searchParams.get('token'), newPassword: 'a-new-password-5678' })
    expect(reset.status).toBe(200)
    // Used up: the next event for this reset composes nothing.
    expect(await composeEmail(db, env, { type: 'password-reset', userId: signUp.user.id })).toBe('no_reset_token')
  })
})
