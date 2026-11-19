import { createFileRoute } from '@tanstack/react-router'
import VerifyEmailPage from '#/components/auth/VerifyEmailPage'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/verify-email')({
  head: createPageHead('Verify Email'),
  validateSearch: (search: Record<string, unknown>): { error?: string } => ({
    error: typeof search.error === 'string' && search.error ? search.error : undefined,
  }),
  component: VerifyEmailRoute,
})

function VerifyEmailRoute() {
  const { error } = Route.useSearch()
  return <VerifyEmailPage {...(error ? { linkError: error } : {})} />
}
