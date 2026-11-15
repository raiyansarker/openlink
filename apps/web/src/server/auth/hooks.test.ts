import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { organization, organizationMember, user } from '@openlink/db/schema'
import { APIError } from 'better-auth/api'

import { createTestDatabase } from '#/server/testing/sqlite'
import { AuthHooks } from './hooks'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date()
  adapter.insert(user).values({ id: 'u1', name: 'Ada', email: 'a@e.test', createdAt: now, updatedAt: now }).run()
  adapter.insert(organization).values({ id: 'o1', name: 'Acme', slug: 'acme', createdAt: now, updatedAt: now }).run()
  return { hooks: new AuthHooks(() => db), adapter, now }
}

const rejection = async (promise: Promise<unknown>) => {
  const error = await promise.then(() => null, (e) => e)
  return error as APIError | null
}

describe('AuthHooks', () => {
  test('create: returns the sanitised user for Better Auth to store', async () => {
    const { hooks } = setup()
    expect(await hooks.beforeCreateUser({ name: ' Ada ', image: 'http://x/a.png' })).toEqual({ data: { name: 'Ada', image: null } })
  })

  test('update: a bad field becomes a 400 APIError with the rule message', async () => {
    const { hooks } = setup()
    const error = await rejection(hooks.beforeUpdateUser({ image: 'data:image/svg+xml;base64,PHN2Zz4=' }))
    expect(error).toBeInstanceOf(APIError)
    expect(error?.status).toBe('BAD_REQUEST')
    expect(error?.message).toContain('PNG, JPG, WebP, or GIF')
  })

  test('update: a valid edit is returned normalised', async () => {
    const { hooks } = setup()
    expect(await hooks.beforeUpdateUser({ name: '  New  Name ' })).toEqual({ data: { name: 'New Name' } })
  })

  test('delete: allowed for an account that owns nothing', async () => {
    const { hooks } = setup()
    expect(await rejection(hooks.beforeDeleteUser({ id: 'u1' }))).toBeNull()
  })

  test('delete: refused while the account owns a workspace', async () => {
    const { hooks, adapter, now } = setup()
    adapter.insert(organizationMember).values({ id: 'm1', organizationId: 'o1', userId: 'u1', role: 'owner', joinedAt: now }).run()
    const error = await rejection(hooks.beforeDeleteUser({ id: 'u1' }))
    expect(error?.status).toBe('BAD_REQUEST')
    expect(error?.message).toContain('You own Acme')
  })

  test('delete: a database failure refuses rather than letting an owner through', async () => {
    const { hooks, adapter } = setup()
    adapter.$client.exec('DROP TABLE organization_member')
    const error = await rejection(hooks.beforeDeleteUser({ id: 'u1' }))
    expect(error?.status).toBe('INTERNAL_SERVER_ERROR')
  })
})
