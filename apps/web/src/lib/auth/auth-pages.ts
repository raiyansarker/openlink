import { redirect } from '@tanstack/react-router'

import { AuthSession } from './client'
import { LoginRedirect } from './redirect'

/** Search params of `/login` and `/signup`. */
export type AuthPageSearch = {
  /** Where to go once signed in; sanitised before use. */
  redirect?: string
  /** Error code returned by the OAuth callback. */
  error?: string
}

/** What `/login` and `/signup` share: their search params, and sending signed-in people on. */
export class AuthPages {
  static validateSearch(search: Record<string, unknown>): AuthPageSearch {
    return {
      redirect: typeof search.redirect === 'string' && search.redirect ? search.redirect : undefined,
      error: typeof search.error === 'string' && search.error ? search.error : undefined,
    }
  }

  /** `beforeLoad`: signed-in people skip the page; others get the enabled sign-in options. */
  static async beforeLoad({ search }: { search: AuthPageSearch }) {
    const state = await AuthSession.state()
    if (state.user) {
      throw redirect({ href: LoginRedirect.sanitize(search.redirect), replace: true })
    }
    return { providers: state.providers, emailPassword: state.emailPassword }
  }
}
