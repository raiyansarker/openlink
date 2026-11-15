import { redirect } from '@tanstack/react-router'
import { createAuthClient } from 'better-auth/react'

import { LoginRedirect } from './redirect'
import { fetchAuthState } from './server-fn'
import { AuthStateCache } from './state-cache'
import type { AuthState } from './types'

/** The browser's view of authentication: sign-in client, cached session state and route guards. */
export class AuthSession {
  /** Talks to Better Auth at `/api/auth/*` on the same origin. */
  static readonly client = createAuthClient()

  /** Browser only: on the server this module is shared by all visitors, so nothing may be cached. */
  private static readonly cache = new AuthStateCache(() => fetchAuthState(), {
    enabled: typeof window !== 'undefined',
  })

  static state(): Promise<AuthState> {
    return AuthSession.cache.get()
  }

  /** Forget the cached state after signing in or out. */
  static invalidate(): void {
    AuthSession.cache.clear()
  }

  /**
   * `beforeLoad` guard: send signed-out visitors to the login page, remembering
   * where they were going. Returns the auth state for the route context.
   */
  static async requireSignedIn(location: { href: string }): Promise<AuthState> {
    const state = await AuthSession.state()
    if (!state.user) {
      throw redirect({
        to: '/login',
        search: { redirect: LoginRedirect.sanitize(location.href) },
        replace: true,
      })
    }
    return state
  }

  static async signOut(): Promise<void> {
    await AuthSession.client.signOut()
    AuthSession.invalidate()
  }
}
