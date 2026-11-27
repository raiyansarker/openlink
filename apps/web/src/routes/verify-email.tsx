import { createFileRoute } from '@tanstack/react-router'
import VerifyEmailPage from '#/components/auth/VerifyEmailPage'
import { LoginRedirect } from '#/lib/auth/redirect'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/verify-email')({
  head: createPageHead('Verify Email'),
  validateSearch: (search: Record<string, unknown>): { error?: string; next?: string } => ({
    error: typeof search.error === 'string' && search.error ? search.error : undefined,
    // Only a same-origin path: a crafted link cannot send people elsewhere.
    next: typeof search.next === 'string' ? LoginRedirect.sanitize(search.next, '') || undefined : undefined,
  }),
  component: VerifyEmailRoute,
})

function VerifyEmailRoute() {
  const { error, next } = Route.useSearch()
  return <VerifyEmailPage {...(error ? { linkError: error } : {})} {...(next ? { next } : {})} />
}
