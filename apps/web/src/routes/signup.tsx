import { createFileRoute } from '@tanstack/react-router'
import SignUpPage from '#/components/auth/SignUpPage'
import { AuthPages } from '#/lib/auth/auth-pages'
import { LoginRedirect } from '#/lib/auth/redirect'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/signup')({
  validateSearch: AuthPages.validateSearch,
  beforeLoad: AuthPages.beforeLoad,
  head: createPageHead('Sign Up'),
  component: SignUpRoute,
})

function SignUpRoute() {
  const search = Route.useSearch()
  const { providers, emailPassword } = Route.useRouteContext()
  return (
    <SignUpPage
      destination={LoginRedirect.sanitize(search.redirect)}
      {...(search.redirect ? { redirect: search.redirect } : {})}
      {...(search.error ? { oauthError: search.error } : {})}
      providers={providers}
      emailPassword={emailPassword}
    />
  )
}
