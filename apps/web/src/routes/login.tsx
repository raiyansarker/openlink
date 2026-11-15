import { createFileRoute, redirect } from '@tanstack/react-router'
import LoginPage from '#/components/login/LoginPage'
import { AuthSession } from '#/lib/auth/client'
import { LoginRedirect } from '#/lib/auth/redirect'
import { createPageHead } from '#/lib/page-title'

type LoginSearch = {
  /** Where to go after signing in; sanitised before use. */
  redirect?: string
  /** Error code returned by the OAuth callback. */
  error?: string
}

export const Route = createFileRoute('/login')({
  head: createPageHead('Sign In'),
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' && search.redirect ? search.redirect : undefined,
    error: typeof search.error === 'string' && search.error ? search.error : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const state = await AuthSession.state()
    if (state.user) {
      throw redirect({ href: LoginRedirect.sanitize(search.redirect), replace: true })
    }
    return { providers: state.providers }
  },
  component: LoginPage,
})
