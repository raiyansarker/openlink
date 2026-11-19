import { createFileRoute } from '@tanstack/react-router'
import CheckEmailPage from '#/components/auth/CheckEmailPage'
import { createPageHead } from '#/lib/page-title'

/** Rough shape check only; the server validates the address when a link is requested. */
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+$/.test(value)

export const Route = createFileRoute('/check-email')({
  head: createPageHead('Check Your Inbox'),
  validateSearch: (search: Record<string, unknown>): { email?: string } => {
    const email = typeof search.email === 'string' ? search.email.trim() : ''
    return looksLikeEmail(email) ? { email } : {}
  },
  component: CheckEmailRoute,
})

function CheckEmailRoute() {
  const { email } = Route.useSearch()
  return <CheckEmailPage {...(email ? { email } : {})} />
}
