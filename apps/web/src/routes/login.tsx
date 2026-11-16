import { createFileRoute } from '@tanstack/react-router'
import SignInPage from '#/components/auth/SignInPage'
import { AuthPages } from '#/lib/auth/auth-pages'
import { LoginRedirect } from '#/lib/auth/redirect'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/login')({
  head: createPageHead('Sign In'),
  validateSearch: AuthPages.validateSearch,
  beforeLoad: AuthPages.beforeLoad,
  component: LoginRoute,
})

function LoginRoute() {
  const search = Route.useSearch()
  const { providers, emailPassword } = Route.useRouteContext()
  return (
    <SignInPage
      destination={LoginRedirect.sanitize(search.redirect)}
      {...(search.redirect ? { redirect: search.redirect } : {})}
      {...(search.error ? { oauthError: search.error } : {})}
      providers={providers}
      emailPassword={emailPassword}
    />
  )
}
