import { createFileRoute } from '@tanstack/react-router'
import ResetPasswordPage from '#/components/auth/ResetPasswordPage'
import { createPageHead } from '#/lib/page-title'

type ResetPasswordSearch = { token?: string; error?: string }

export const Route = createFileRoute('/reset-password')({
  head: createPageHead('Reset Password'),
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    token: typeof search.token === 'string' && search.token ? search.token : undefined,
    error: typeof search.error === 'string' && search.error ? search.error : undefined,
  }),
  component: ResetPasswordRoute,
})

function ResetPasswordRoute() {
  const { token, error } = Route.useSearch()
  return <ResetPasswordPage {...(token ? { token } : {})} {...(error ? { linkError: error } : {})} />
}
