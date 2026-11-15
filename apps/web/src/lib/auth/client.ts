import { redirect } from '@tanstack/react-router'
import { createAuthClient } from 'better-auth/react'

import { AccessRules } from './access'
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
   * `beforeLoad` guard for every page behind sign-in. Signed-out visitors go to
   * login (remembering where they were); people who have not onboarded go to
   * /onboarding; onboarded people are kept off /onboarding.
   */
  static async requireSignedIn(location: { pathname: string; href: string }): Promise<AuthState> {
    const state = await AuthSession.state()
    const decision = AccessRules.decide(state, location)
    if (decision.allow) return state
    if (decision.to === '/login') {
      throw redirect({ to: '/login', search: { redirect: decision.redirect }, replace: true })
    }
    throw redirect({ href: decision.to, replace: true })
  }

  static async signOut(): Promise<void> {
    await AuthSession.client.signOut()
    AuthSession.invalidate()
  }
}
