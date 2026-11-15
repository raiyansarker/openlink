import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { organization, organizationMember, user } from '@openlink/db/schema'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { AccountPolicy, AccountStillOwnsWorkspaces, ProfileFieldRejected } from './account-policy'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

const run = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(effect)
const flip = <A, E>(effect: Effect.Effect<A, E>) => Effect.runPromise(Effect.flip(effect))

describe('AccountPolicy.sanitizeNewUser', () => {
  test('normalises the name and keeps an acceptable provider picture', async () => {
    const result = await run(AccountPolicy.sanitizeNewUser({ name: '  Ada  L ', image: 'https://avatars.example/a.png', email: 'a@e.test' }))
    expect(result).toEqual({ name: 'Ada L', image: 'https://avatars.example/a.png', email: 'a@e.test' })
  })

  test('drops an unacceptable provider picture instead of failing sign-in', async () => {
    const result = await run(AccountPolicy.sanitizeNewUser({ name: 'Ada', image: 'http://insecure.example/a.png' }))
    expect(result.image).toBeNull()
  })

  test('a missing name is rejected', async () => {
    expect(await flip(AccountPolicy.sanitizeNewUser({ name: '  ' }))).toBeInstanceOf(ProfileFieldRejected)
  })
})

describe('AccountPolicy.validateUpdate', () => {
  const profile = { fromProfileEndpoint: true }

  test('passes through fields it does not govern and normalises the name', async () => {
    expect(await run(AccountPolicy.validateUpdate({ name: ' Ada ', updatedAt: 5 }, profile))).toEqual({ name: 'Ada', updatedAt: 5 })
  })

  test('an update that touches neither name nor picture is unchanged', async () => {
    expect(await run(AccountPolicy.validateUpdate({ emailVerified: true }, profile))).toEqual({ emailVerified: true })
  })

  test('the profile endpoint cannot set or clear the picture; the upload endpoint owns it', async () => {
    for (const image of ['https://evil.example/a.png', '/api/media/avatars/someone-else/x.png', null]) {
      const error = await flip(AccountPolicy.validateUpdate({ image }, profile))
      expect(error).toMatchObject({ _tag: 'ProfileFieldRejected', message: expect.stringContaining('Upload') })
    }
  })

  test('internal updates (not the profile endpoint) may still carry a picture', async () => {
    expect(await run(AccountPolicy.validateUpdate({ image: null }, { fromProfileEndpoint: false }))).toEqual({ image: null })
  })

  test('rejects a blank name', async () => {
    expect(await flip(AccountPolicy.validateUpdate({ name: '' }, profile))).toBeInstanceOf(ProfileFieldRejected)
  })
})

describe('AccountPolicy.ensureDeletable', () => {
  function setup() {
    const { sqlite, adapter, db } = createTestDatabase()
    databases.push(sqlite)
    const now = new Date()
    adapter.insert(user).values([
      { id: 'u1', name: 'Ada', email: 'a@e.test', createdAt: now, updatedAt: now },
      { id: 'u2', name: 'Bob', email: 'b@e.test', createdAt: now, updatedAt: now },
    ]).run()
    adapter.insert(organization).values([
      { id: 'o1', name: 'Acme', slug: 'acme', createdAt: now, updatedAt: now },
      { id: 'o2', name: 'Globex', slug: 'globex', createdAt: now, updatedAt: now },
    ]).run()
    const member = (id: string, userId: string, organizationId: string, role: 'owner' | 'admin' | 'member') =>
      adapter.insert(organizationMember).values({ id, userId, organizationId, role, joinedAt: now }).run()
    const check = (userId: string) => Effect.runPromise(
      AccountPolicy.ensureDeletable(userId).pipe(Effect.provideService(Db, db), Effect.flip, Effect.orElseSucceed(() => null)),
    )
    return { member, check }
  }

  test('allows deleting an account that owns nothing', async () => {
    const t = setup()
    t.member('m1', 'u1', 'o1', 'admin')
    expect(await t.check('u1')).toBeNull()
  })

  test('blocks deletion while the account owns workspaces, naming them', async () => {
    const t = setup()
    t.member('m1', 'u1', 'o1', 'owner')
    t.member('m2', 'u1', 'o2', 'owner')
    t.member('m3', 'u2', 'o1', 'member')
    const error = await t.check('u1')
    expect(error).toBeInstanceOf(AccountStillOwnsWorkspaces)
    expect((error as AccountStillOwnsWorkspaces).workspaces.sort()).toEqual(['Acme', 'Globex'])
    expect((error as AccountStillOwnsWorkspaces).message).toContain('Transfer ownership or delete them')
    expect(await t.check('u2')).toBeNull()
  })

  test('the message uses the singular for one workspace', async () => {
    const t = setup()
    t.member('m1', 'u1', 'o1', 'owner')
    expect(((await t.check('u1')) as AccountStillOwnsWorkspaces).message).toBe(
      'You own Acme. Transfer ownership or delete it before deleting your account.',
    )
  })
})
