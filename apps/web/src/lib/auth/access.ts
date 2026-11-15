import { LoginRedirect } from './redirect'
import type { AuthState } from './types'

export type AccessDecision =
  | { allow: true }
  | { allow: false; to: '/login'; redirect: string }
  | { allow: false; to: '/onboarding' }
  | { allow: false; to: '/w' }

/** Where a visitor may go: signed out → login; not onboarded → onboarding; onboarding done → never back to it. */
export class AccessRules {
  static readonly ONBOARDING_PATH = '/onboarding'

  static decide(state: AuthState, location: { pathname: string; href: string }): AccessDecision {
    const isOnboardingPage = location.pathname === AccessRules.ONBOARDING_PATH
    if (!state.user) {
      return { allow: false, to: '/login', redirect: LoginRedirect.sanitize(isOnboardingPage ? undefined : location.href) }
    }
    if (!state.user.onboarded) return isOnboardingPage ? { allow: true } : { allow: false, to: '/onboarding' }
    return isOnboardingPage ? { allow: false, to: '/w' } : { allow: true }
  }
}
