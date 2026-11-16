import { type } from 'arktype'

export const DeviceSession = type({
  id: 'string',
  /** The device making this request. */
  current: 'boolean',
  'ipAddress?': 'string',
  'userAgent?': 'string',
  'city?': 'string',
  'country?': 'string',
  'latitude?': 'number',
  'longitude?': 'number',
  /** `google`, `github`, or `email`. */
  'signInMethod?': 'string',
  signedInAt: 'string',
  lastActiveAt: 'string',
})

export const ListDeviceSessionsResponse = type({ items: DeviceSession.array() })

export const SessionIdPath = type({ sessionId: 'string' })

export const RevokeOtherSessionsResponse = type({ revoked: 'number.integer>=0' })

/** A workspace invite addressed to the signed-in user's email. */
export const MyInvite = type({
  id: 'string',
  role: "'admin' | 'member' | 'viewer'",
  invitedAt: 'string',
  expiresAt: 'string',
  organization: type({ id: 'string', name: 'string', slug: 'string', 'logoUrl?': 'string' }),
  /** Absent when an API key sent it, or the sender's account is gone. */
  'invitedBy?': type({ name: 'string', 'imageUrl?': 'string' }),
})

export const ListMyInvitesResponse = type({ items: MyInvite.array() })

export const MyInviteIdPath = type({ inviteId: 'string' })
