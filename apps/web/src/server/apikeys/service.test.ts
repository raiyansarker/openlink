import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { apiKey } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { ApiKeyNotFound } from './errors'
import { hashApiKey } from './secret'
import {
  LAST_USED_RESOLUTION_MS,
  authenticateApiKey,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  updateApiKeyRole,
} from './service'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  const fail = <A, E>(effect: Effect.Effect<A, E, Db>) =>
    Effect.runPromise(effect.pipe(Effect.provideService(Db, db), Effect.flip))
  const create = (overrides: Partial<Parameters<typeof createApiKey>[0]> = {}) =>
    run(createApiKey({ organizationId: 'o1', name: ' CI deploy ', role: 'member', createdByUserId: 'u1', ...overrides }))
  const stored = (id: string) => adapter.select().from(apiKey).where(eq(apiKey.id, id)).get()
  return { run, fail, create, stored, adapter, db }
}

describe('createApiKey', () => {
  test('stores only the hash and returns the secret once', async () => {
    const t = setup()
    const { row, secret } = await t.create()
    expect(row).toMatchObject({ name: 'CI deploy', role: 'member', organizationId: 'o1', lastUsedAt: null })
    expect(row.keyHash).toBe(hashApiKey(secret))
    expect(row.prefix).toBe(secret.slice(0, 12))
    const dump = JSON.stringify(t.adapter.select().from(apiKey).all())
    expect(dump).not.toContain(secret)
  })
})

describe('listApiKeys', () => {
  test('is scoped to the organization, oldest first, without secrets', async () => {
    const t = setup()
    await t.create({ name: 'first' })
    await new Promise((resolve) => setTimeout(resolve, 2))
    await t.create({ name: 'second' })
    await t.create({ organizationId: 'o2', name: 'other' })
    const rows = await t.run(listApiKeys('o1'))
    expect(rows.map((r) => r.name)).toEqual(['first', 'second'])
  })
})

describe('updateApiKeyRole / revokeApiKey', () => {
  test('changes the role and reports the previous one', async () => {
    const t = setup()
    const { row } = await t.create({ role: 'viewer' })
    const result = await t.run(updateApiKeyRole({ organizationId: 'o1', keyId: row.id, role: 'admin' }))
    expect(result).toMatchObject({ previousRole: 'viewer', row: { role: 'admin' } })
    expect(t.stored(row.id)?.role).toBe('admin')
  })

  test('cannot touch keys of another organization', async () => {
    const t = setup()
    const { row } = await t.create()
    expect(await t.fail(updateApiKeyRole({ organizationId: 'o2', keyId: row.id, role: 'admin' }))).toBeInstanceOf(ApiKeyNotFound)
    expect(await t.fail(revokeApiKey('o2', row.id))).toBeInstanceOf(ApiKeyNotFound)
    expect(t.stored(row.id)).toBeDefined()
  })

  test('a revoked key can no longer authenticate', async () => {
    const t = setup()
    const { row, secret } = await t.create()
    expect(await t.run(authenticateApiKey(secret))).not.toBeNull()
    expect(await t.run(revokeApiKey('o1', row.id))).toMatchObject({ id: row.id, name: 'CI deploy' })
    expect(await t.run(authenticateApiKey(secret))).toBeNull()
    expect(await t.fail(revokeApiKey('o1', row.id))).toBeInstanceOf(ApiKeyNotFound)
  })
})

describe('authenticateApiKey', () => {
  test('resolves a valid secret to its workspace principal', async () => {
    const t = setup()
    const { row, secret } = await t.create({ role: 'admin' })
    expect(await t.run(authenticateApiKey(secret))).toEqual({
      id: row.id, organizationId: 'o1', role: 'admin', name: 'CI deploy',
    })
  })

  test('unknown, truncated and tampered secrets resolve to null', async () => {
    const t = setup()
    const { secret } = await t.create()
    for (const bad of ['ol_live_nope', secret.slice(0, -1), `${secret}x`, secret.toUpperCase(), '']) {
      expect(await t.run(authenticateApiKey(bad))).toBeNull()
    }
  })

  test('picks up a role change immediately', async () => {
    const t = setup()
    const { row, secret } = await t.create({ role: 'admin' })
    await t.run(updateApiKeyRole({ organizationId: 'o1', keyId: row.id, role: 'viewer' }))
    expect((await t.run(authenticateApiKey(secret)))?.role).toBe('viewer')
  })

  test('refreshes lastUsedAt only when it is stale', async () => {
    const t = setup()
    const { row, secret } = await t.create()
    const t0 = new Date('2026-06-01T00:00:00Z')
    await t.run(authenticateApiKey(secret, t0))
    expect(t.stored(row.id)?.lastUsedAt).toEqual(t0)
    await t.run(authenticateApiKey(secret, new Date(t0.getTime() + LAST_USED_RESOLUTION_MS - 1)))
    expect(t.stored(row.id)?.lastUsedAt).toEqual(t0)
    const later = new Date(t0.getTime() + LAST_USED_RESOLUTION_MS + 1)
    await t.run(authenticateApiKey(secret, later))
    expect(t.stored(row.id)?.lastUsedAt).toEqual(later)
  })

  test('a failed bookkeeping write does not reject a valid key', async () => {
    const t = setup()
    const { secret } = await t.create()
    t.adapter.$client.exec(`CREATE TRIGGER no_touch BEFORE UPDATE ON api_key BEGIN SELECT RAISE(ABORT, 'read only'); END`)
    expect(await t.run(authenticateApiKey(secret))).toMatchObject({ organizationId: 'o1' })
  })
})
