import { describe, expect, test } from 'bun:test'
import { Effect } from 'effect'

import { BackendError } from '#/server/effect/operations'
import { Auth } from '#/server/effect/services/auth'
import { AuthHandler } from './handler'

const handleAuthRequest = AuthHandler.handle
const authUnavailable = AuthHandler.unavailable

const provide = (auth: Effect.Effect<unknown, BackendError>) =>
  Effect.provideService(Auth, auth as never)

describe('AuthHandler', () => {
  test('delegates the untouched request to Better Auth and returns its response', async () => {
    const request = new Request('http://localhost:3000/api/auth/callback/github?code=abc')
    const seen: Request[] = []
    const response = new Response('ok', { status: 302, headers: { location: '/w' } })
    const result = await Effect.runPromise(
      handleAuthRequest(request).pipe(
        provide(Effect.succeed({ handler: async (r: Request) => (seen.push(r), response) })),
      ),
    )
    expect(seen).toEqual([request])
    expect(result).toBe(response)
  })

  test('a handler failure is a typed BackendError', async () => {
    const error = await Effect.runPromise(
      handleAuthRequest(new Request('http://localhost/api/auth/x')).pipe(
        provide(Effect.succeed({ handler: async () => { throw new Error('boom') } })),
        Effect.flip,
      ),
    )
    expect(error).toBeInstanceOf(BackendError)
    expect(error.operation).toBe('auth.handle')
  })

  test('an initialization failure surfaces without calling the handler', async () => {
    const init = new BackendError({ operation: 'auth.initialize', cause: new Error('bad secret') })
    const error = await Effect.runPromise(
      handleAuthRequest(new Request('http://localhost/api/auth/x')).pipe(provide(Effect.fail(init)), Effect.flip),
    )
    expect(error).toBe(init)
  })

  test('the fallback response is a 503 without internals', async () => {
    const response = authUnavailable()
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('secret')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  test('serve turns any failure into the 503 fallback', async () => {
    const init = new BackendError({ operation: 'auth.initialize', cause: new Error('bad secret') })
    const response = await Effect.runPromise(
      AuthHandler.serve(new Request('http://localhost/api/auth/x')).pipe(provide(Effect.fail(init))),
    )
    expect(response.status).toBe(503)
  })
})
