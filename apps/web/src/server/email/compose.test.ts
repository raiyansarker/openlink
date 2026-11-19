import { describe, expect, test } from 'bun:test'
import { organization, organizationInvite, user, verification } from '@openlink/db/schema'
import { createTestDatabase } from '../testing/sqlite'
import { composeEmail, type ComposedEmail } from './compose'

const env = { BETTER_AUTH_URL: 'https://app.example.com', BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long' }
const NOW = new Date('2026-01-01T12:00:00Z')
const HOUR = 60 * 60 * 1000

async function setup(options: { verified?: boolean } = {}) {
  const { db } = createTestDatabase()
  await db.insert(user).values({ id: 'u1', name: 'Ada', email: 'ada@example.com', emailVerified: options.verified ?? false, createdAt: NOW, updatedAt: NOW })
  await db.insert(organization).values({ id: 'o1', name: 'Acme', slug: 'acme', createdAt: NOW, updatedAt: NOW })
  return db
}

const props = (email: ComposedEmail | string) => (typeof email === 'string' ? {} : (email.message.props as Record<string, string>))

/** The payload of a JWT, without checking its signature. */
const jwtPayload = (token: string) => JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))

describe('composeEmail', () => {
  test('verification: a fresh signed link for the current address', async () => {
    const db = await setup()
    const email = await composeEmail(db, env, { type: 'email-verification', userId: 'u1' }, NOW)
    expect(typeof email !== 'string' && email.to).toBe('ada@example.com')
    const url = new URL(props(email).verifyUrl)
    expect(url.origin + url.pathname).toBe('https://app.example.com/api/auth/verify-email')
    expect(url.searchParams.get('callbackURL')).toBe('/verify-email')
    expect(jwtPayload(url.searchParams.get('token')!)).toMatchObject({ email: 'ada@example.com', userId: 'u1' })
    expect(props(email)).toMatchObject({ name: 'Ada', baseUrl: 'https://app.example.com', logoUrl: 'https://app.example.com/logo192.png' })
  })

  test('verification: skipped once verified, or once the account is gone', async () => {
    expect(await composeEmail(await setup({ verified: true }), env, { type: 'email-verification', userId: 'u1' }, NOW)).toBe('already_verified')
    expect(await composeEmail(await setup(), env, { type: 'email-verification', userId: 'missing' }, NOW)).toBe('user_deleted')
  })

  test('reset: links the newest unexpired token Better Auth stored', async () => {
    const db = await setup()
    await db.insert(verification).values([
      { id: 'v1', identifier: 'reset-password:old', value: 'u1', expiresAt: new Date(NOW.getTime() + HOUR), createdAt: new Date(NOW.getTime() - 10_000) },
      { id: 'v2', identifier: 'reset-password:new', value: 'u1', expiresAt: new Date(NOW.getTime() + HOUR), createdAt: NOW },
      { id: 'v3', identifier: 'reset-password:expired', value: 'u1', expiresAt: new Date(NOW.getTime() - 1), createdAt: new Date(NOW.getTime() + 1) },
    ])
    const email = await composeEmail(db, env, { type: 'password-reset', userId: 'u1' }, NOW)
    expect(props(email).resetUrl).toBe('https://app.example.com/api/auth/reset-password/new?callbackURL=%2Freset-password')
  })

  test('reset: skipped when the token was used or expired', async () => {
    const db = await setup()
    await db.insert(verification).values({ id: 'v1', identifier: 'reset-password:t', value: 'u1', expiresAt: new Date(NOW.getTime() - 1), createdAt: NOW })
    expect(await composeEmail(db, env, { type: 'password-reset', userId: 'u1' }, NOW)).toBe('no_reset_token')
  })

  test('password changed: reports the time and device from the event', async () => {
    const db = await setup()
    const email = await composeEmail(db, env, { type: 'password-changed', userId: 'u1', occurredAt: NOW.getTime(), device: 'Chrome on macOS', location: 'Dhaka, Bangladesh' }, NOW)
    expect(props(email)).toMatchObject({ device: 'Chrome on macOS', location: 'Dhaka, Bangladesh', securityUrl: 'https://app.example.com/settings/devices' })
  })

  test('invite: built from the invite, workspace and inviter as they are now', async () => {
    const db = await setup()
    const invite = { organizationId: 'o1', email: 'grace@example.com', role: 'member' as const, kind: 'member' as const, createdAt: NOW }
    await db.insert(organizationInvite).values([
      { ...invite, id: 'i1', tokenHash: 'h1', expiresAt: new Date(NOW.getTime() + HOUR) },
      { ...invite, id: 'i2', tokenHash: 'h2', expiresAt: new Date(NOW.getTime() + HOUR), acceptedAt: NOW },
      { ...invite, id: 'i3', tokenHash: 'h3', expiresAt: NOW },
    ])
    const email = await composeEmail(db, env, { type: 'workspace-invite', inviteId: 'i1', inviterUserId: 'u1' }, NOW)
    expect(typeof email !== 'string' && email.to).toBe('grace@example.com')
    expect(props(email)).toMatchObject({ workspaceName: 'Acme', inviterName: 'Ada', inviteUrl: 'https://app.example.com/dashboard' })
    // An API key (or a deleted inviter) is named as the workspace team.
    expect(props(await composeEmail(db, env, { type: 'workspace-invite', inviteId: 'i1', inviterUserId: null }, NOW)).inviterName).toBe('The Acme team')
    expect(await composeEmail(db, env, { type: 'workspace-invite', inviteId: 'i2', inviterUserId: 'u1' }, NOW)).toBe('invite_accepted')
    expect(await composeEmail(db, env, { type: 'workspace-invite', inviteId: 'i3', inviterUserId: 'u1' }, NOW)).toBe('invite_expired')
    expect(await composeEmail(db, env, { type: 'workspace-invite', inviteId: 'revoked', inviterUserId: 'u1' }, NOW)).toBe('invite_gone')
  })
})
