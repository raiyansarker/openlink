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
