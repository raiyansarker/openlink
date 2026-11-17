import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { organization, organizationMember, user } from '@openlink/db/schema'
import { ORPCError } from '@orpc/server'
import { Effect } from 'effect'

import { createApiKey, listApiKeys, revokeApiKey } from '#/server/apikeys/service'
import { createTestAuth, signUpTestUser } from '#/server/testing/auth'
import { createTestDatabase } from '#/server/testing/sqlite'
import {
  requireLinkWriterEffect,
  requireOrgAdminEffect,
  requireOrgAdminUserEffect,
  requireOrgMemberEffect,
  requireOrgOwnerEffect,
} from './access'
import { principalUserId, requirePrincipal } from './principal'
import { Auth } from './services/auth'
import { Db } from './services/db'
import { WorkerRequest } from './services/request'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

async function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date()
  adapter.insert(organization).values([
    { id: 'o1', name: 'Acme', slug: 'acme', createdAt: now, updatedAt: now },
    { id: 'o2', name: 'Other', slug: 'other', createdAt: now, updatedAt: now },
  ]).run()
  adapter.insert(user).values({ id: 'u1', name: 'Ada', email: 'ada@example.com', createdAt: now, updatedAt: now }).run()
  adapter.insert(organizationMember).values({ id: 'm1', organizationId: 'o1', userId: 'u1', role: 'member', joinedAt: now }).run()

  // Keys are issued through the real Better Auth API key plugin by an owner of both workspaces.
  const auth = createTestAuth(adapter)
  const keymaker = await signUpTestUser(auth, 'keymaker@example.com')
  adapter.insert(organizationMember).values([
    { id: 'm2', organizationId: 'o1', userId: keymaker.userId, role: 'owner', joinedAt: now },
    { id: 'm3', organizationId: 'o2', userId: keymaker.userId, role: 'owner', joinedAt: now },
  ]).run()

  let cookieUser: { id: string; name: string; email: string; createdAt: string } | null = null
  const getSession = async () => (cookieUser ? { session: { id: 's1' }, user: cookieUser } : null)
  const signIn = () => {
    cookieUser = { id: 'u1', name: 'Ada', email: 'ada@example.com', createdAt: now.toISOString() }
  }

  const run = <A, E, R>(effect: Effect.Effect<A, E, R>, headers: Record<string, string> = {}) =>
    Effect.runPromise(
      effect.pipe(
        Effect.provideService(WorkerRequest, new Request('http://localhost/api/v1/x', { headers })),
        Effect.provideService(Db, db),
        Effect.provideService(Auth, Effect.succeed({ ...auth, api: { ...auth.api, getSession } } as never)),
      ) as Effect.Effect<A, E, never>,
    )
  const fail = <A, E, R>(effect: Effect.Effect<A, E, R>, headers: Record<string, string> = {}) =>
    run(Effect.flip(effect), headers)
  const key = (role: 'admin' | 'member' | 'viewer', organizationId = 'o1') =>
    run(createApiKey({ organizationId, name: `${role} key`, role, createdByUserId: keymaker.userId })).then(({ secret }) => ({
      authorization: `Bearer ${secret}`,
    }))
  return { run, fail, key, signIn, keymaker }
}

const code = (error: unknown) => (error instanceof ORPCError ? error.code : String(error))

describe('requirePrincipal', () => {
  test('rejects anonymous requests', async () => {
    const t = await setup()
    expect(code(await t.fail(requirePrincipal))).toBe('UNAUTHORIZED')
  })

  test('a signed-in member is a user principal', async () => {
    const t = await setup()
    t.signIn()
    const principal = await t.run(requirePrincipal)
    expect(principal.apiKey).toBeUndefined()
    expect(principal.session.user.id).toBe('u1')
    expect(principalUserId(principal)).toBe('u1')
  })

  test('a valid API key is a workspace principal with no user id', async () => {
    const t = await setup()
    const principal = await t.run(requirePrincipal, await t.key('admin'))
    expect(principal.apiKey).toMatchObject({ organizationId: 'o1', role: 'admin' })
    expect(principalUserId(principal)).toBeNull()
    expect(principal.session.user.id.startsWith('apikey:')).toBe(true)
  })

  test('an invalid key is rejected and never falls back to the cookie session', async () => {
    const t = await setup()
    t.signIn()
    expect(code(await t.fail(requirePrincipal, { authorization: 'Bearer ol_live_forged' }))).toBe('UNAUTHORIZED')
  })

  test('other bearer tokens are ignored in favour of the cookie session', async () => {
    const t = await setup()
    t.signIn()
    const principal = await t.run(requirePrincipal, { authorization: 'Bearer something-else' })
    expect(principal.session.user.id).toBe('u1')
    const t2 = await setup()
    expect(code(await t2.fail(requirePrincipal, { authorization: 'Bearer something-else' }))).toBe('UNAUTHORIZED')
  })
})

describe('workspace access with API keys', () => {
  test('a key is a member of its own workspace only', async () => {
    const t = await setup()
    const headers = await t.key('member')
    expect((await t.run(requireOrgMemberEffect('o1'), headers)).membership.role).toBe('member')
    expect(code(await t.fail(requireOrgMemberEffect('o2'), headers))).toBe('FORBIDDEN')
  })

  test('a key from another workspace has no access', async () => {
    const t = await setup()
    const foreign = await t.key('admin', 'o2')
    expect(code(await t.fail(requireOrgMemberEffect('o1'), foreign))).toBe('FORBIDDEN')
    expect(code(await t.fail(requireOrgAdminEffect('o1'), foreign))).toBe('FORBIDDEN')
  })

  test('the key role decides what it may do', async () => {
    const t = await setup()
    const viewer = await t.key('viewer')
    const member = await t.key('member')
    const admin = await t.key('admin')
    expect(code(await t.fail(requireLinkWriterEffect('o1'), viewer))).toBe('FORBIDDEN')
    await t.run(requireLinkWriterEffect('o1'), member)
    expect(code(await t.fail(requireOrgAdminEffect('o1'), member))).toBe('FORBIDDEN')
    await t.run(requireOrgAdminEffect('o1'), admin)
  })

  test('a key can never be the owner', async () => {
    const t = await setup()
    expect(code(await t.fail(requireOrgOwnerEffect('o1'), await t.key('admin')))).toBe('FORBIDDEN')
  })

  test('keys cannot manage keys, but admin members can', async () => {
    const t = await setup()
    const error = await t.fail(requireOrgAdminUserEffect('o1'), await t.key('admin'))
    expect(code(error)).toBe('FORBIDDEN')
    expect((error as ORPCError<string, unknown>).message).toContain('API keys cannot manage API keys')
    t.signIn()
    expect(code(await t.fail(requireOrgAdminUserEffect('o1')))).toBe('FORBIDDEN') // plain member
  })

  test('a revoked key stops working immediately', async () => {
    const t = await setup()
    const headers = await t.key('admin')
    await t.run(requireOrgAdminEffect('o1'), headers)
    const [row] = await t.run(listApiKeys('o1'), t.keymaker.headers)
    await t.run(revokeApiKey('o1', row!.id), t.keymaker.headers)
    expect(code(await t.fail(requireOrgAdminEffect('o1'), headers))).toBe('UNAUTHORIZED')
  })
})
