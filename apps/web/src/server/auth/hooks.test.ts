import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { organization, organizationMember, user } from '@openlink/db/schema'
import { APIError } from 'better-auth/api'

import { createTestDatabase } from '#/server/testing/sqlite'
import { FakeBucket, IMAGES } from '#/server/media/test-support'
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
  return { hooks: new AuthHooks(() => db, () => ({}) as never), adapter, now }
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

  test('update: a picture sent to the profile endpoint becomes a 400 APIError', async () => {
    const { hooks } = setup()
    const error = await rejection(hooks.beforeUpdateUser({ image: 'https://evil.example/a.png' }, '/update-user'))
    expect(error).toBeInstanceOf(APIError)
    expect(error?.status).toBe('BAD_REQUEST')
    expect(error?.message).toContain('Upload')
  })

  test('delete: the uploaded picture is removed from R2 afterwards; provider pictures are left alone', async () => {
    const bucket = new FakeBucket()
    bucket.objects.set('avatars/u1/a.webp', { bytes: IMAGES.webp, contentType: 'image/webp' })
    const { db } = createTestDatabase()
    const hooks = new AuthHooks(() => db, () => ({ MEDIA: bucket }) as never)
    await hooks.afterDeleteUser({ image: 'https://avatars.githubusercontent.com/u/1' })
    expect(bucket.objects.size).toBe(1)
    await hooks.afterDeleteUser({ image: '/api/media/avatars/u1/a.webp' })
    expect(bucket.objects.size).toBe(0)
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

describe('AuthHooks.beforeCreateSession', () => {
  test('adds the location from the request and the provider from the callback', async () => {
    const hooks = new AuthHooks(() => ({}) as never, () => ({}) as never)
    const request = Object.assign(new Request('http://localhost/api/auth/callback/github'), {
      cf: { city: 'Lisbon', country: 'PT', latitude: '38.72', longitude: '-9.14' },
    })
    const result = await hooks.beforeCreateSession({ userId: 'u1', token: 't' }, { path: '/callback/:id', params: { id: 'github' }, request })
    expect(result.data).toEqual({
      userId: 'u1', token: 't', city: 'Lisbon', country: 'PT', latitude: 38.72, longitude: -9.14, signInMethod: 'github',
    })
  })

  test('without request data the session is still created, with nothing invented', async () => {
    const hooks = new AuthHooks(() => ({}) as never, () => ({}) as never)
    const result = await hooks.beforeCreateSession({ token: 't' }, null)
    expect(result.data).toMatchObject({ city: null, latitude: null, signInMethod: null })
  })
})
