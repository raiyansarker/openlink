import { Effect } from 'effect'

import { operation } from '../effect/operations'
import { useAuth } from '../effect/services/auth'

/** The `/api/auth/*` edge: sign-in, OAuth callbacks and sign-out are Better Auth's. */
export class AuthHandler {
  /** Hand the untouched request to Better Auth. */
  static handle(request: Request) {
    return Effect.gen(function* () {
      const auth = yield* useAuth
      return yield* operation('auth.handle', () => auth.handler(request))
    })
  }

  /** Misconfiguration or an upstream failure must not leak details to a browser. */
  static unavailable() {
    return new Response(JSON.stringify({ message: 'Authentication is temporarily unavailable' }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  }

  /** Handle a request, answering 503 on any failure. */
  static serve(request: Request) {
    return AuthHandler.handle(request).pipe(
      Effect.catchCause((cause) => Effect.logError('auth.request_failed', cause).pipe(Effect.as(AuthHandler.unavailable()))),
      Effect.annotateLogs({ method: request.method, path: new URL(request.url).pathname }),
      Effect.withSpan('auth.request'),
    )
  }
}
