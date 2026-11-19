import { Effect } from 'effect'

import type { Principal } from '#/server/effect/principal'
import { principalUserId } from '#/server/effect/principal'
import { EmailDispatch } from '#/server/email/dispatch'

/**
 * Emit the invitation email for a new or resent invite. Never fails the invite: the invite
 * exists whether or not the email goes out. The workflow loads the invite when it sends,
 * so a revoked or accepted invite gets no email.
 */
export function sendInviteEmail(input: { organizationId: string; invite: { id: string; email: string }; inviter: Principal }) {
  return Effect.gen(function* () {
    const emails = yield* EmailDispatch
    yield* emails.send(
      input.invite.email,
      { type: 'workspace-invite', inviteId: input.invite.id, inviterUserId: principalUserId(input.inviter) },
      // Invites come from signed-in members, so the workspace limit applies rather than the per-IP one.
      { organizationId: input.organizationId },
    )
  }).pipe(Effect.catch(() => Effect.void))
}
