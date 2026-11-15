import { Context, Effect } from 'effect'
import type { getAuth } from '#/server/auth/instance'
import type { BackendError } from '../operations'

type AuthInstance = ReturnType<typeof getAuth>

/**
 * Lazy accessor: constructing Better Auth can fail on bad configuration, and
 * that must not prevent the runtime (and /health) from starting.
 */
export class Auth extends Context.Service<Auth, Effect.Effect<AuthInstance, BackendError>>()(
  'openlink/Auth',
) {}

/** Resolve the auth instance; fails with a typed BackendError only when used. */
export const useAuth = Effect.gen(function* () {
  const resolve = yield* Auth
  return yield* resolve
})
