import { Effect } from 'effect'

import { authenticateApiKey, type ApiKeyPrincipal } from '#/server/apikeys/service'
import { readBearerApiKey } from '#/server/apikeys/secret'
import { unauthorized } from '#/server/orpc/errors'

import { readSessionEffect } from './session'
import { WorkerRequest } from './services/request'

export type PrincipalUser = { id: string; name: string; email: string }

/**
 * Who is calling: a signed-in member, or an API key acting for one workspace.
 * `session.user` is shaped like a Better Auth session so handlers can use either.
 */
export type Principal = {
  session: { user: PrincipalUser }
  apiKey?: ApiKeyPrincipal
}

/** Key principals have no `user` row, so anything stored against a user id must skip them. */
export const principalUserId = (principal: Principal) => (principal.apiKey ? null : principal.session.user.id)

/**
 * Resolve the caller from either credential. A request that presents an OpenLink
 * API key is judged by that key alone: an invalid key is a 401 and never falls
 * back to a cookie.
 */
export const requirePrincipal = Effect.gen(function* () {
  const request = yield* WorkerRequest
  const secret = readBearerApiKey(request.headers.get('authorization'))
  if (secret) {
    const apiKey = yield* authenticateApiKey(secret)
    if (!apiKey) return yield* Effect.fail(unauthorized())
    return {
      session: { user: { id: `apikey:${apiKey.id}`, name: apiKey.name, email: '' } },
      apiKey,
    } satisfies Principal
  }
  const session = yield* readSessionEffect
  if (!session) return yield* Effect.fail(unauthorized())
  return { session: { user: session.session.user } } satisfies Principal
})
