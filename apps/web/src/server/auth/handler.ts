import { Effect } from 'effect'

import { operation } from '../effect/operations'
import { useAuth } from '../effect/services/auth'
import { Bindings } from '../effect/services/bindings'
import { VerificationGate } from './verification-gate'

/** The `/api/auth/*` edge: sign-in, OAuth callbacks and sign-out are Better Auth's. */
export class AuthHandler {
  /** Hand the request to Better Auth, behind the pending-verification gate. */
  static handle(request: Request) {
    return Effect.gen(function* () {
      const auth = yield* useAuth
      const { BETTER_AUTH_SECRET } = yield* Bindings
      return yield* operation('auth.handle', () =>
        VerificationGate.around(request, BETTER_AUTH_SECRET, (forwarded) => auth.handler(forwarded)),
      )
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
