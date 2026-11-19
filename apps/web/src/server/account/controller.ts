import { Effect } from 'effect'

import { toDeviceSessionDto, toMembershipDto, toMyInviteDto } from '#/server/api/serializers'
import { requireAuthSession } from '#/server/effect/session'
import { audit } from '#/server/activity/audit'
import { DeviceSessions } from '#/server/devices/sessions'
import { acceptInviteById, declineInviteForEmail, findInviteForEmail, listInvitesForEmail } from '#/server/org/service'
import { os } from '#/server/orpc/implement'

import { requireInvitee, type InviteGuardFailure } from './invite-guard'
import { Profile } from './profile'

/** Not yours, gone, expired or unverified: one answer for all, so invite ids can't be probed. */
const INVITE_UNAVAILABLE = 'This invite is no longer available'

export const accountController = {
  // Cookie sessions only: an API key is not a device and must not sign people out.
  listDeviceSessions: os.account.listDeviceSessions.effect(function* () {
    const session = yield* requireAuthSession
    const currentId = session.session.session.id
    const rows = yield* DeviceSessions.list(session.session.user.id)
    return { items: rows.map((row) => toDeviceSessionDto(row, currentId)) }
  }),

  revokeDeviceSession: os.account.revokeDeviceSession.effect(function* ({ input, errors }) {
    const session = yield* requireAuthSession
    yield* DeviceSessions.revoke({
      userId: session.session.user.id,
      sessionId: input.params.sessionId,
      currentSessionId: session.session.session.id,
    }).pipe(
      Effect.catchTags({
        DeviceSessionNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'That device is already signed out' })),
        CannotRevokeCurrentSession: () => Effect.fail(errors.BAD_REQUEST({ message: 'Use Log out to sign out this device' })),
      }),
    )
    return {}
  }),

  revokeOtherDeviceSessions: os.account.revokeOtherDeviceSessions.effect(function* () {
    const session = yield* requireAuthSession
    const revoked = yield* DeviceSessions.revokeOthers({
      userId: session.session.user.id,
      currentSessionId: session.session.session.id,
    })
    return { revoked }
  }),

  // Invites addressed to you. Matched on your signed-in email, so only you can see or answer them.
  listMyInvites: os.account.listMyInvites.effect(function* () {
    const session = yield* requireAuthSession
    const rows = yield* listInvitesForEmail(session.session.user.email)
    return { items: rows.map(toMyInviteDto) }
  }),

  getMyInvite: os.account.getMyInvite.effect(function* ({ input, errors }) {
    const guard = yield* requireInvitee
    if (!guard.ok) return yield* Effect.fail(inviteGuardError(errors, guard.failure))
    const found = yield* findInviteForEmail({ inviteId: input.params.inviteId, email: guard.session.session.user.email })
    if (!found) return yield* Effect.fail(errors.NOT_FOUND({ message: INVITE_UNAVAILABLE }))
    return found.status === 'accepted' ? { status: 'accepted' as const } : { status: 'pending' as const, invite: toMyInviteDto(found.row) }
  }),

  acceptMyInvite: os.account.acceptMyInvite.effect(function* ({ input, errors }) {
    const guard = yield* requireInvitee
    if (!guard.ok) return yield* Effect.fail(inviteGuardError(errors, guard.failure))
    const session = guard.session
    const { org, member } = yield* acceptInviteById({
      inviteId: input.params.inviteId,
      userId: session.session.user.id,
      userEmail: session.session.user.email,
    }).pipe(Effect.catchTags({
      InviteEmailMismatch: () => Effect.fail(errors.NOT_FOUND({ message: INVITE_UNAVAILABLE })),
      InvalidInvite: () => Effect.fail(errors.NOT_FOUND({ message: INVITE_UNAVAILABLE })),
    }))
    yield* audit(session, {
      organizationId: org.id,
      action: 'member.joined',
      target: { type: 'member', id: session.session.user.id, label: session.session.user.name || session.session.user.email },
    })
    return toMembershipDto(org, member)
  }),

  declineMyInvite: os.account.declineMyInvite.effect(function* ({ input, errors }) {
    const guard = yield* requireInvitee
    if (!guard.ok) return yield* Effect.fail(inviteGuardError(errors, guard.failure))
    const session = guard.session
    const declined = yield* declineInviteForEmail({ inviteId: input.params.inviteId, userEmail: session.session.user.email }).pipe(
      Effect.catchTags({ InvalidInvite: () => Effect.fail(errors.NOT_FOUND({ message: INVITE_UNAVAILABLE })) }),
    )
    yield* audit(session, {
      organizationId: declined.organizationId,
      action: 'invite.declined',
      target: { type: 'invite', id: declined.id, label: declined.email },
    })
    return {}
  }),

  // Cookie sessions only: an API key acts for a workspace, not for a person's profile.
  updateMyProfile: os.account.updateMyProfile.effect(function* ({ input, errors }) {
    const session = yield* requireAuthSession
    const profile = yield* Profile.update(session.session.user.id, input.body).pipe(
      Effect.catchTags({
        UploadRejected: (error) => Effect.fail(errors.BAD_REQUEST({ message: error.message })),
        ProfileFieldRejected: (error) => Effect.fail(errors.BAD_REQUEST({ message: error.message })),
      }),
    )
    return { name: profile.name, ...(profile.imageUrl ? { imageUrl: profile.imageUrl } : {}) }
  }),
}

function inviteGuardError(
  errors: { NOT_FOUND: (options: { message: string }) => unknown; TOO_MANY_REQUESTS: (options: { message: string }) => unknown },
  failure: InviteGuardFailure,
) {
  return failure === 'rate_limited'
    ? errors.TOO_MANY_REQUESTS({ message: 'Too many requests. Try again in a minute.' })
    : errors.NOT_FOUND({ message: INVITE_UNAVAILABLE })
}
