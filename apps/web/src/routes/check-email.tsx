import { createFileRoute, redirect } from '@tanstack/react-router'
import CheckEmailPage from '#/components/auth/CheckEmailPage'
import { fetchPendingVerification } from '#/lib/auth/server-fn'
import { createPageHead } from '#/lib/page-title'

/**
 * Only for a browser that just signed up, or signed in before verifying: the server sets a
 * signed cookie then. Anyone else is sent to sign in, which leads back here if needed.
 */
export const Route = createFileRoute('/check-email')({
  head: createPageHead('Check Your Inbox'),
  loader: async () => {
    const pending = await fetchPendingVerification()
    if (!pending) throw redirect({ to: '/login', replace: true })
    return pending
  },
  // The cookie changes on every sign-in and resend; never show a cached answer.
  staleTime: 0,
  gcTime: 0,
  component: CheckEmailRoute,
})

function CheckEmailRoute() {
  const { email, resendAt } = Route.useLoaderData()
  return <CheckEmailPage email={email} resendAt={resendAt} />
}
