import { describe, expect, test } from 'bun:test'
import { Effect } from 'effect'

import type { WorkerBindings } from '#/server/env'
import { BackendError } from '#/server/effect/operations'
import { Auth } from '#/server/effect/services/auth'
import { Bindings } from '#/server/effect/services/bindings'
import { AuthStateReader } from './state'

const run = (
  getSession: () => Promise<unknown>,
  bindings: Partial<WorkerBindings> = {},
  auth: Effect.Effect<unknown, BackendError> = Effect.succeed({ api: { getSession } }),
) =>
  Effect.runPromise(
    AuthStateReader.read(new Request('http://localhost/x')).pipe(
      Effect.provideService(Bindings, bindings as WorkerBindings),
      Effect.provideService(Auth, auth as never),
    ),
  )

const created = new Date('2026-01-01T00:00:00Z')

describe('AuthStateReader.read', () => {
  test('signed-in callers get a minimal user and the enabled providers', async () => {
    const state = await run(
      async () => ({ user: { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null, createdAt: created } }),
      { GOOGLE_CLIENT_ID: 'g', GOOGLE_CLIENT_SECRET: 's' },
    )
    expect(state).toEqual({
      user: { id: 'u1', name: 'Ada', email: 'ada@example.com', image: null },
      providers: { google: true, github: false },
    })
  })

  test('only the fields the UI needs leave the server', async () => {
    const state = await run(async () => ({
      user: { id: 'u1', name: 'Ada', email: 'a@e.test', image: 'https://img/a.png', createdAt: created, emailVerified: true },
      session: { token: 'secret-token' },
    }))
    expect(JSON.stringify(state)).not.toContain('secret-token')
    expect(state.user).toEqual({ id: 'u1', name: 'Ada', email: 'a@e.test', image: 'https://img/a.png' })
  })

  test('no session means signed out', async () => {
    expect((await run(async () => null)).user).toBeNull()
  })

  test('a session lookup failure is treated as signed out, not an error', async () => {
    const state = await run(async () => { throw new Error('db down') })
    expect(state.user).toBeNull()
  })

  test('auth initialization failure is treated as signed out', async () => {
    const init = new BackendError({ operation: 'auth.initialize', cause: new Error('bad secret') })
    const state = await run(async () => null, {}, Effect.fail(init))
    expect(state).toEqual({ user: null, providers: { google: false, github: false } })
  })
})
