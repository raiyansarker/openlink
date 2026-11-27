import { organizationInvite, user } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
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

/**
 * Tell whoever sent an invite that it was accepted. Nothing for invites an API key sent.
 * Never fails the join. The workflow checks again when it sends (the inviter is still in
 * the workspace, and so is the new member).
 */
export function sendInviteAcceptedEmail(input: { inviteId: string; memberUserId: string; ip: string | null }) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [inviter] = yield* operation('invites.findInviter', () =>
      db
        .select({ id: user.id, email: user.email })
        .from(organizationInvite)
        .innerJoin(user, eq(user.id, organizationInvite.createdByUserId))
        .where(eq(organizationInvite.id, input.inviteId))
        .limit(1),
    )
    if (!inviter || inviter.id === input.memberUserId) return
    const emails = yield* EmailDispatch
    yield* emails.send(inviter.email, { type: 'invite-accepted', inviteId: input.inviteId, memberUserId: input.memberUserId }, { ip: input.ip })
  }).pipe(Effect.catch(() => Effect.void))
}
