import { createFileRoute, notFound, redirect } from '@tanstack/react-router'

import { PendingInvite, RateLimitedInvite, SignedOutInvite } from '#/components/invite/InvitePage'
import { fetchInvitePage } from '#/lib/auth/server-fn'
import { createPageHead } from '#/lib/page-title'

/**
 * An invite's own page, the link in the invite email. Decided on the server
 * (`server/account/invite-page.ts`):
 * - signed out: "Sign in to view this invite", the same for every id;
 * - pending and sent to the signed-in address: accept or decline;
 * - already accepted by that address: on to the app;
 * - anything else (someone else's, revoked, declined, expired, unknown): 404.
 *
 * Not behind the onboarding guard: a new account joins its first workspace from here.
 */
export const Route = createFileRoute('/invite/$inviteId')({
  // The title never names the workspace, so a shared screen or history entry says nothing.
  head: createPageHead('Invitation'),
  loader: async ({ params }) => {
    const state = await fetchInvitePage({ data: params.inviteId })
    if (state.status === 'not_found') throw notFound()
    if (state.status === 'accepted') throw redirect({ to: '/w', replace: true })
    return state
  },
  // Sign-in, accept and decline all change the answer; never show a cached one.
  staleTime: 0,
  gcTime: 0,
  component: InviteRoute,
})

function InviteRoute() {
  const state = Route.useLoaderData()
  const { inviteId } = Route.useParams()
  if (state.status === 'signed_out') return <SignedOutInvite inviteId={inviteId} />
  if (state.status === 'rate_limited') return <RateLimitedInvite />
  return <PendingInvite invite={state.invite} />
}
