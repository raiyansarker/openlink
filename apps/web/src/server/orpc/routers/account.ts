import { Effect } from 'effect'

import { toDeviceSessionDto, toMembershipDto, toMyInviteDto } from '#/server/api/serializers'
import { requireAuthSession } from '#/server/effect/session'
import { audit } from '#/server/activity/audit'
import { DeviceSessions } from '#/server/devices/sessions'
import { acceptInviteById, declineInviteForEmail, listInvitesForEmail } from '#/server/org/service'

import { os } from './os'

export const accountRouter = {
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

  acceptMyInvite: os.account.acceptMyInvite.effect(function* ({ input, errors }) {
    const session = yield* requireAuthSession
    const { org, member } = yield* acceptInviteById({
      inviteId: input.params.inviteId,
      userId: session.session.user.id,
      userEmail: session.session.user.email,
    }).pipe(Effect.catchTags({
      // Not yours, gone or expired: all look the same, so ids can't be probed.
      InviteEmailMismatch: () => Effect.fail(errors.NOT_FOUND({ message: 'This invite is no longer available' })),
      InvalidInvite: () => Effect.fail(errors.NOT_FOUND({ message: 'This invite is no longer available' })),
    }))
    yield* audit(session, {
      organizationId: org.id,
      action: 'member.joined',
      target: { type: 'member', id: session.session.user.id, label: session.session.user.name || session.session.user.email },
    })
    return toMembershipDto(org, member)
  }),

  declineMyInvite: os.account.declineMyInvite.effect(function* ({ input, errors }) {
    const session = yield* requireAuthSession
    const declined = yield* declineInviteForEmail({ inviteId: input.params.inviteId, userEmail: session.session.user.email }).pipe(
      Effect.catchTags({ InvalidInvite: () => Effect.fail(errors.NOT_FOUND({ message: 'This invite is no longer available' })) }),
    )
    yield* audit(session, {
      organizationId: declined.organizationId,
      action: 'invite.declined',
      target: { type: 'invite', id: declined.id, label: declined.email },
    })
    return {}
  }),
}
