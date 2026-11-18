import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { apikey, organization, organizationMember } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { Auth } from '#/server/effect/services/auth'
import { WorkerRequest } from '#/server/effect/services/request'
import { createTestAuth, signUpTestUser } from '#/server/testing/auth'
import { createTestDatabase } from '#/server/testing/sqlite'
import { ApiKeyNotFound } from './errors'
import { authenticateApiKey, createApiKey, listApiKeys, revokeApiKey, rotateApiKey, updateApiKeyRole } from './service'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

type Role = 'owner' | 'admin' | 'member' | 'viewer'

async function setup() {
  const { sqlite, adapter } = createTestDatabase()
  databases.push(sqlite)
  const auth = createTestAuth(adapter)
  const now = new Date()
  adapter.insert(organization).values([
    { id: 'o1', name: 'Acme', slug: 'acme', createdAt: now, updatedAt: now },
    { id: 'o2', name: 'Other', slug: 'other', createdAt: now, updatedAt: now },
  ]).run()

  const member = async (email: string, roles: Partial<Record<'o1' | 'o2', Role>>) => {
    const user = await signUpTestUser(auth, email)
    for (const [organizationId, role] of Object.entries(roles)) {
      adapter.insert(organizationMember).values({ id: crypto.randomUUID(), organizationId, userId: user.userId, role: role!, joinedAt: now }).run()
    }
    return user
  }
  const admin = await member('admin@example.com', { o1: 'admin', o2: 'owner' })

  const run = <A, E, R>(effect: Effect.Effect<A, E, R>, headers: Record<string, string> = admin.headers) =>
    Effect.runPromise(
      effect.pipe(
        Effect.provideService(WorkerRequest, new Request('http://localhost/api/v1/x', { headers })),
        Effect.provideService(Auth, Effect.succeed(auth as never)),
      ) as Effect.Effect<A, E, never>,
    )
  const fail = <A, E, R>(effect: Effect.Effect<A, E, R>, headers?: Record<string, string>) => run(Effect.flip(effect), headers)
  const create = (overrides: Partial<Parameters<typeof createApiKey>[0]> = {}) =>
    run(createApiKey({ organizationId: 'o1', name: ' CI deploy ', role: 'member', createdByUserId: admin.userId, ...overrides }))
  const stored = (id: string) => adapter.select().from(apikey).where(eq(apikey.id, id)).get()
  return { run, fail, create, stored, member, admin, adapter }
}

describe('createApiKey', () => {
  test('stores only the hash and returns the secret once', async () => {
    const t = await setup()
    const { row, secret } = await t.create()
    expect(row).toMatchObject({ name: 'CI deploy', role: 'member', organizationId: 'o1', lastUsedAt: null })
    expect(secret.startsWith('sk_')).toBe(true)
    expect(row.prefix).toBe(secret.slice(0, 9))
    expect(t.stored(row.id)?.referenceId).toBe('o1')
    expect(JSON.stringify(t.adapter.select().from(apikey).all())).not.toContain(secret)
  })

  test('only workspace owners and admins may create keys', async () => {
    const t = await setup()
    const plain = await t.member('member@example.com', { o1: 'member' })
    const attempt = (userId: string) => t.fail(createApiKey({ organizationId: 'o1', name: 'x', role: 'admin', createdByUserId: userId }))
    expect(await attempt(plain.userId)).toMatchObject({ _tag: 'BackendError' })
    const outsider = await t.member('outsider@example.com', {})
    expect(await attempt(outsider.userId)).toMatchObject({ _tag: 'BackendError' })
    await t.create({ organizationId: 'o2' }) // owner of o2
  })
})

describe('listApiKeys', () => {
  test('is scoped to the organization, oldest first, without secrets', async () => {
    const t = await setup()
    await t.create({ name: 'first' })
    await new Promise((resolve) => setTimeout(resolve, 2))
    await t.create({ name: 'second' })
    await t.create({ organizationId: 'o2', name: 'other' })
    const rows = await t.run(listApiKeys('o1'))
    expect(rows.map((r) => r.name)).toEqual(['first', 'second'])
  })

  test('hides keys that carry no workspace role', async () => {
    const t = await setup()
    const { row } = await t.create()
    t.adapter.update(apikey).set({ permissions: null }).where(eq(apikey.id, row.id)).run()
    expect(await t.run(listApiKeys('o1'))).toEqual([])
  })

  test('a plain member cannot list keys', async () => {
    const t = await setup()
    const plain = await t.member('member@example.com', { o1: 'member' })
    expect(await t.fail(listApiKeys('o1'), plain.headers)).toMatchObject({ _tag: 'BackendError' })
  })
})

describe('updateApiKeyRole / revokeApiKey', () => {
  test('changes the role and reports the previous one', async () => {
    const t = await setup()
    const { row } = await t.create({ role: 'viewer' })
    const result = await t.run(updateApiKeyRole({ organizationId: 'o1', keyId: row.id, role: 'admin', userId: t.admin.userId }))
    expect(result).toMatchObject({ previousRole: 'viewer', row: { role: 'admin' } })
    expect(t.stored(row.id)?.permissions).toBe(JSON.stringify({ workspace: ['admin'] }))
  })

  test('cannot touch keys of another organization', async () => {
    const t = await setup()
    const { row } = await t.create()
    expect(await t.fail(updateApiKeyRole({ organizationId: 'o2', keyId: row.id, role: 'admin', userId: t.admin.userId }))).toBeInstanceOf(ApiKeyNotFound)
    expect(await t.fail(revokeApiKey('o2', row.id))).toBeInstanceOf(ApiKeyNotFound)
    expect(t.stored(row.id)).toBeDefined()
  })

  test('a revoked key can no longer authenticate', async () => {
    const t = await setup()
    const { row, secret } = await t.create()
    expect(await t.run(authenticateApiKey(secret))).not.toBeNull()
    expect(await t.run(revokeApiKey('o1', row.id))).toMatchObject({ id: row.id, name: 'CI deploy' })
    expect(await t.run(authenticateApiKey(secret))).toBeNull()
    expect(await t.fail(revokeApiKey('o1', row.id))).toBeInstanceOf(ApiKeyNotFound)
  })
})

describe('rotateApiKey', () => {
  test('swaps in a new key with the same name and role, and the old secret stops working', async () => {
    const t = await setup()
    const { row, secret } = await t.create({ role: 'viewer' })
    const rotated = await t.run(rotateApiKey({ organizationId: 'o1', keyId: row.id, createdByUserId: t.admin.userId }))
    expect(rotated.row).toMatchObject({ name: 'CI deploy', role: 'viewer', organizationId: 'o1' })
    expect(rotated.row.id).not.toBe(row.id)
    expect(rotated.secret.startsWith('sk_')).toBe(true)
    expect(await t.run(authenticateApiKey(secret))).toBeNull()
    expect(await t.run(authenticateApiKey(rotated.secret))).toMatchObject({ role: 'viewer' })
    expect((await t.run(listApiKeys('o1'))).map((k) => k.id)).toEqual([rotated.row.id])
  })

  test('creates nothing when the key does not exist or belongs to another organization', async () => {
    const t = await setup()
    const { row } = await t.create()
    expect(await t.fail(rotateApiKey({ organizationId: 'o2', keyId: row.id, createdByUserId: t.admin.userId }))).toBeInstanceOf(ApiKeyNotFound)
    expect(await t.fail(rotateApiKey({ organizationId: 'o1', keyId: 'missing', createdByUserId: t.admin.userId }))).toBeInstanceOf(ApiKeyNotFound)
    expect(await t.run(listApiKeys('o1'))).toHaveLength(1)
  })
})

describe('authenticateApiKey', () => {
  test('resolves a valid secret to its workspace principal and records its use', async () => {
    const t = await setup()
    const { row, secret } = await t.create({ role: 'admin' })
    expect(await t.run(authenticateApiKey(secret))).toEqual({ id: row.id, organizationId: 'o1', role: 'admin', name: 'CI deploy' })
    expect(t.stored(row.id)?.lastRequest).toBeInstanceOf(Date)
  })

  test('unknown, truncated and tampered secrets resolve to null', async () => {
    const t = await setup()
    const { secret } = await t.create()
    for (const bad of ['sk_nope', secret.slice(0, -1), `${secret}x`, secret.toUpperCase(), '']) {
      expect(await t.run(authenticateApiKey(bad))).toBeNull()
    }
  })

  test('disabled keys and keys without a role resolve to null', async () => {
    const t = await setup()
    const disabled = await t.create()
    t.adapter.update(apikey).set({ enabled: false }).where(eq(apikey.id, disabled.row.id)).run()
    expect(await t.run(authenticateApiKey(disabled.secret))).toBeNull()
    const roleless = await t.create()
    t.adapter.update(apikey).set({ permissions: null }).where(eq(apikey.id, roleless.row.id)).run()
    expect(await t.run(authenticateApiKey(roleless.secret))).toBeNull()
  })

  test('picks up a role change immediately', async () => {
    const t = await setup()
    const { row, secret } = await t.create({ role: 'admin' })
    await t.run(updateApiKeyRole({ organizationId: 'o1', keyId: row.id, role: 'viewer', userId: t.admin.userId }))
    expect((await t.run(authenticateApiKey(secret)))?.role).toBe('viewer')
  })

  test('is not rate limited', async () => {
    const t = await setup()
    const { secret } = await t.create()
    for (let i = 0; i < 15; i++) expect(await t.run(authenticateApiKey(secret))).not.toBeNull()
  })
})
