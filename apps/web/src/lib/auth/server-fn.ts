import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import type { AuthState } from './types'

/**
 * Reads the caller's session on the server (cookie-based). Server modules are
 * imported inside the handler so they never reach the browser bundle.
 */
export const fetchAuthState = createServerFn({ method: 'GET' }).handler(async (): Promise<AuthState> => {
  const [{ effectRuntime }, { AuthStateReader }] = await Promise.all([
    import('#/server/effect/runtime'),
    import('#/server/auth/state'),
  ])
  return effectRuntime.runPromise(AuthStateReader.read(getRequest()))
})

/**
 * The address this browser is waiting to verify, from the signed pending-verification
 * cookie, and when it may ask for another link (epoch ms; 0 = now). Null without a valid cookie.
 */
export const fetchPendingVerification = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ email: string; resendAt: number } | null> => {
    const [{ getBindings }, { PendingVerifications }] = await Promise.all([
      import('#/server/env'),
      import('#/server/auth/pending-verification'),
    ])
    const pending = await PendingVerifications.open(getBindings().BETTER_AUTH_SECRET, getRequest())
    return pending ? { email: pending.email, resendAt: PendingVerifications.resendAt(pending) } : null
  },
)
