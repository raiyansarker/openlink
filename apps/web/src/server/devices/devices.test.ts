import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { session, user } from '@openlink/db/schema'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { SessionOriginReader } from './session-origin'
import { CannotRevokeCurrentSession, DeviceSessionNotFound, DeviceSessions } from './sessions'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

describe('SessionOriginReader', () => {
  test('reads place and position from Cloudflare data and the provider from the callback', () => {
    expect(
      SessionOriginReader.read({
        cf: { city: 'Dhaka', country: 'BD', latitude: '23.81', longitude: '90.41' },
        path: '/callback/:id',
        providerId: 'github',
      }),
    ).toEqual({ city: 'Dhaka', country: 'BD', latitude: 23.81, longitude: 90.41, signInMethod: 'github' })
  })

  test('recognises email sign-in and the provider from a concrete callback path', () => {
    expect(SessionOriginReader.read({ path: '/sign-in/email' }).signInMethod).toBe('email')
    expect(SessionOriginReader.read({ path: '/callback/google' }).signInMethod).toBe('google')
    expect(SessionOriginReader.read({ path: '/callback/unknown' }).signInMethod).toBeNull()
    expect(SessionOriginReader.read({}).signInMethod).toBeNull()
  })

  test('drops partial, out-of-range or junk location data', () => {
    expect(SessionOriginReader.read({ cf: { latitude: 23.8 } })).toMatchObject({ latitude: null, longitude: null })
    expect(SessionOriginReader.read({ cf: { latitude: 95, longitude: 10 } })).toMatchObject({ latitude: null, longitude: null })
    expect(SessionOriginReader.read({ cf: { city: '   ', country: 42 } })).toMatchObject({ city: null, country: null })
    expect(SessionOriginReader.read({ cf: null })).toMatchObject({ city: null, latitude: null })
  })
})

describe('DeviceSessions', () => {
  function setup() {
    const { sqlite, adapter, db } = createTestDatabase()
    databases.push(sqlite)
    const now = new Date('2026-06-01T00:00:00Z')
    adapter.insert(user).values([
      { id: 'u1', name: 'Ada', email: 'a@e.test', createdAt: now, updatedAt: now },
      { id: 'u2', name: 'Bob', email: 'b@e.test', createdAt: now, updatedAt: now },
    ]).run()
    const add = (id: string, userId: string, minutesAgo: number, expiresInMs = 86_400_000) =>
      adapter.insert(session).values({
        id, userId, token: `tok-${id}`, createdAt: now,
        updatedAt: new Date(now.getTime() - minutesAgo * 60_000),
        expiresAt: new Date(now.getTime() + expiresInMs), city: 'Dhaka', signInMethod: 'github',
      }).run()
    add('current', 'u1', 0)
    add('laptop', 'u1', 30)
    add('phone', 'u1', 10)
    add('expired', 'u1', 5, -1000)
    add('bobs', 'u2', 1)
    const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
    const flip = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db), Effect.flip))
    const ids = () => adapter.select({ id: session.id }).from(session).all().map((r) => r.id).sort()
    return { run, flip, ids, now }
  }

  test('lists only this person’s unexpired sessions, most recent first, without tokens', async () => {
    const t = setup()
    const rows = await t.run(DeviceSessions.list('u1', t.now))
    expect(rows.map((r) => r.id)).toEqual(['current', 'phone', 'laptop'])
    expect(JSON.stringify(rows)).not.toContain('tok-')
    expect(rows[0]).toMatchObject({ city: 'Dhaka', signInMethod: 'github' })
  })

  test('revokes one of this person’s other sessions', async () => {
    const t = setup()
    await t.run(DeviceSessions.revoke({ userId: 'u1', sessionId: 'laptop', currentSessionId: 'current' }))
    expect(t.ids()).toEqual(['bobs', 'current', 'expired', 'phone'])
  })

  test('cannot revoke someone else’s session, an unknown one, or the current one', async () => {
    const t = setup()
    expect(await t.flip(DeviceSessions.revoke({ userId: 'u1', sessionId: 'bobs', currentSessionId: 'current' }))).toBeInstanceOf(DeviceSessionNotFound)
    expect(await t.flip(DeviceSessions.revoke({ userId: 'u1', sessionId: 'nope', currentSessionId: 'current' }))).toBeInstanceOf(DeviceSessionNotFound)
    expect(await t.flip(DeviceSessions.revoke({ userId: 'u1', sessionId: 'current', currentSessionId: 'current' }))).toBeInstanceOf(CannotRevokeCurrentSession)
    expect(t.ids()).toEqual(['bobs', 'current', 'expired', 'laptop', 'phone'])
  })

  test('signing out everywhere else keeps the current session and other people’s', async () => {
    const t = setup()
    expect(await t.run(DeviceSessions.revokeOthers({ userId: 'u1', currentSessionId: 'current' }))).toBe(3)
    expect(t.ids()).toEqual(['bobs', 'current'])
  })
})
