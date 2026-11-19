import { Effect } from 'effect'

import { Bindings } from '#/server/effect/services/bindings'
import { WorkerRequest } from '#/server/effect/services/request'
import { clientIp } from '#/server/rate-limit/limiter'
import type { Principal } from '#/server/effect/principal'
import { EmailFormat } from '#/server/email/format'
import { EmailDispatch } from '#/server/email/dispatch'

import { getOrganizationById } from './service'

/**
 * Send the invitation email for a new or resent invite.
 * Never fails the invite: the invite exists whether or not the email goes out.
 *
 * The link opens the app rather than carrying the token. Invites are matched to the
 * invitee's account by email address and appear in their notifications after sign-in.
 */
export function sendInviteEmail(input: {
  organizationId: string
  invite: { email: string; role: string; expiresAt: Date }
  inviter: Principal
}) {
  return Effect.gen(function* () {
    const bindings = yield* Bindings
    const emails = yield* EmailDispatch
    const request = yield* WorkerRequest
    const org = yield* getOrganizationById(input.organizationId)
    // Key principals are not people, so the email names the workspace instead.
    const inviterName = input.inviter.apiKey ? `The ${org?.name ?? 'workspace'} team` : input.inviter.session.user.name
    yield* emails.send(input.invite.email, {
      template: 'workspace-invite',
      props: {
        workspaceName: org?.name ?? 'a workspace',
        inviterName,
        role: EmailFormat.role(input.invite.role),
        inviteUrl: new URL('/dashboard', bindings.BETTER_AUTH_URL).toString(),
        expiresAt: EmailFormat.date(input.invite.expiresAt),
      },
    }, { ip: clientIp(request), organizationId: input.organizationId })
  }).pipe(Effect.catch(() => Effect.void))
}
