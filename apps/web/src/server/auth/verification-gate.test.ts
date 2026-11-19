import { describe, expect, test } from 'bun:test'
import * as schema from '@openlink/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createEmailVerificationToken } from 'better-auth/api'
import { createTestDatabase } from '../testing/sqlite'
import { PENDING_VERIFICATION_COOKIE, PendingVerifications } from './pending-verification'
import { VerificationGate } from './verification-gate'

const SECRET = 'test-secret-that-is-at-least-32-characters-long'

/** A real Better Auth with required verification, behind the gate. Records every verification email. */
function setup() {
  const { db } = createTestDatabase()
  const sent: string[] = []
  const auth = betterAuth({
    baseURL: 'http://localhost',
    secret: SECRET,
    database: drizzleAdapter(db as never, {
      provider: 'sqlite',
      schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
    }),
    emailAndPassword: { enabled: true, requireEmailVerification: true },
    emailVerification: { sendOnSignUp: true, sendVerificationEmail: async ({ user }) => void sent.push(user.email) },
    logger: { disabled: true },
  })
  const post = (path: string, body: object, cookie?: string) =>
    VerificationGate.around(
      new Request(`http://localhost/api/auth${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost', ...(cookie ? { cookie } : {}) },
        body: JSON.stringify(body),
      }),
      SECRET,
      (request) => auth.handler(request),
    )
  const verify = async (email: string, cookie?: string) => {
    const token = await createEmailVerificationToken(SECRET, email, undefined, 3600)
    return VerificationGate.around(
      new Request(`http://localhost/api/auth/verify-email?token=${token}&callbackURL=%2Fverify-email`, { headers: cookie ? { cookie } : {} }),
      SECRET,
      (request) => auth.handler(request),
    )
  }
  return { sent, post, verify }
}

/** The `name=value` pair of the pending-verification cookie a response set, if any. */
const pendingCookie = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .find((pair) => pair.startsWith(`${PENDING_VERIFICATION_COOKIE}=`) && pair.length > PENDING_VERIFICATION_COOKIE.length + 1)

const pendingFrom = (cookie: string | undefined) =>
  PendingVerifications.open(SECRET, new Request('http://localhost', { headers: cookie ? { cookie } : {} }))

const account = { email: 'Ada@Example.com', password: 'correct-horse-battery', name: 'Ada' }

describe('VerificationGate', () => {
  test('sign-up issues a signed HttpOnly cookie for the address, marked as just sent', async () => {
    const { sent, post } = setup()
    const response = await post('/sign-up/email', account)
    expect(sent).toEqual(['ada@example.com'])
    const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith(PENDING_VERIFICATION_COOKIE))
    expect(header).toContain('HttpOnly')
    const pending = await pendingFrom(pendingCookie(response))
    expect(pending?.email).toBe('ada@example.com')
    expect(pending?.sentAt).toBeGreaterThan(0)
  })

  test('an unverified sign-in with the right password issues it and sends nothing', async () => {
    const { sent, post } = setup()
    await post('/sign-up/email', account)
    const signIn = await post('/sign-in/email', { email: account.email, password: account.password })
    expect(signIn.status).toBe(403)
    expect(sent).toHaveLength(1)
    expect((await pendingFrom(pendingCookie(signIn)))?.email).toBe('ada@example.com')
  })

  test('a wrong password issues nothing', async () => {
    const { post } = setup()
    await post('/sign-up/email', account)
    const signIn = await post('/sign-in/email', { email: account.email, password: 'wrong-password-123' })
    expect(signIn.status).toBe(401)
    expect(pendingCookie(signIn)).toBeUndefined()
  })

  test('resend without the cookie looks successful but sends nothing', async () => {
    const { sent, post } = setup()
    await post('/sign-up/email', account)
    const resend = await post('/send-verification-email', { email: account.email })
    expect(resend.status).toBe(200)
    expect(await resend.json()).toEqual({ status: true })
    expect(sent).toHaveLength(1)
  })

  test('resend with the cookie for another address sends nothing', async () => {
    const { sent, post } = setup()
    const signUp = await post('/sign-up/email', account)
    await post('/sign-up/email', { ...account, email: 'grace@example.com' })
    await post('/send-verification-email', { email: 'grace@example.com' }, pendingCookie(signUp))
    expect(sent).toEqual(['ada@example.com', 'grace@example.com'])
  })

  test('resend with the matching cookie sends and refreshes the send time', async () => {
    const { sent, post } = setup()
    const signIn = await (async () => {
      await post('/sign-up/email', account)
      return post('/sign-in/email', { email: account.email, password: account.password })
    })()
    const cookie = pendingCookie(signIn)
    expect((await pendingFrom(cookie))?.sentAt).toBe(0)
    const resend = await post('/send-verification-email', { email: 'ada@example.com' }, cookie)
    expect(resend.status).toBe(200)
    expect(sent).toEqual(['ada@example.com', 'ada@example.com'])
    expect((await pendingFrom(pendingCookie(resend)))?.sentAt).toBeGreaterThan(0)
  })

  test('a tampered or expired cookie is not accepted', async () => {
    const sealed = await PendingVerifications.seal(SECRET, PendingVerifications.create('ada@example.com', 1, 0))
    const expired = await PendingVerifications.open(SECRET, new Request('http://x', { headers: { cookie: `${PENDING_VERIFICATION_COOKIE}=${sealed}` } }), Date.now())
    expect(expired).toBeNull()
    const fresh = await PendingVerifications.seal(SECRET, PendingVerifications.create('ada@example.com', 1))
    const [payload, signature] = fresh.split('.')
    const forged = `${btoa(JSON.stringify({ email: 'grace@example.com', sentAt: 1, expiresAt: Date.now() + 1e6 })).replace(/=+$/, '')}.${signature}`
    expect(await PendingVerifications.open(SECRET, new Request('http://x', { headers: { cookie: `${PENDING_VERIFICATION_COOKIE}=${forged}` } }))).toBeNull()
    expect(await PendingVerifications.open('another-secret', new Request('http://x', { headers: { cookie: `${PENDING_VERIFICATION_COOKIE}=${payload}.${signature}` } }))).toBeNull()
  })

  test('a destination asked for at sign-up survives verification, in the same browser', async () => {
    const { post, verify } = setup()
    const signUp = await post('/sign-up/email', { ...account, callbackURL: '/verify-email?next=%2Finvite%2Fabc' })
    const cookie = pendingCookie(signUp)
    expect((await pendingFrom(cookie))?.next).toBe('/invite/abc')
    const verified = await verify('ada@example.com', cookie)
    expect(verified.headers.get('location')).toBe('/verify-email?next=%2Finvite%2Fabc')
  })

  test('without the cookie, or with an off-site destination, verification lands on the plain page', async () => {
    const { post, verify } = setup()
    const signUp = await post('/sign-up/email', { ...account, callbackURL: '/verify-email?next=%2F%2Fevil.example' })
    expect((await pendingFrom(pendingCookie(signUp)))?.next).toBeUndefined()
    expect((await verify('ada@example.com')).headers.get('location')).toBe('/verify-email')
  })
})
