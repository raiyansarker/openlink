import { Effect } from 'effect'

import { requireSession } from '#/server/auth/session'
import { unauthorized } from '#/server/orpc/errors'

import { WorkerRequest } from './services/request'

export const readSessionEffect = Effect.gen(function* () {
  const request = yield* WorkerRequest
  return yield* requireSession(request)
})

export const requireAuthSession = Effect.gen(function* () {
  const session = yield* readSessionEffect
  if (!session) {
    return yield* Effect.fail(unauthorized())
  }
  return session
})
