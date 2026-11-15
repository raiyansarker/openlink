import { Effect } from 'effect'

import { operation } from '../effect/operations'
import { useAuth } from '../effect/services/auth'

/** Hand a request on `/api/auth/*` (sign-in, OAuth callbacks, sign-out) to Better Auth. */
export function handleAuthRequest(request: Request) {
  return Effect.gen(function* () {
    const auth = yield* useAuth
    return yield* operation('auth.handle', () => auth.handler(request))
  })
}

/** Misconfiguration or an upstream failure must not leak details to a browser. */
export const authUnavailable = () =>
  new Response(JSON.stringify({ message: 'Authentication is temporarily unavailable' }), {
    status: 503,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
