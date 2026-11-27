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

/**
 * One invite, for the person it was sent to. `accepted` means it is already used up.
 * Not yours, revoked, declined, expired or unknown all answer 404, alike.
 */
export const MyInviteLookup = type({ status: "'pending'", invite: MyInvite }).or({ status: "'accepted'" })

/**
 * A profile picture: a PNG, JPEG, WebP or GIF of at most 1 MB, sent as a file field in a
 * `multipart/form-data` body. The browser app sends a 256px WebP.
 */
export const ProfilePicture = type.instanceOf(Blob)

/** Every field is optional: absent keeps it. `image` as a file replaces the picture (multipart); null removes it (JSON). */
export const UpdateMyProfileRequest = type({
  'name?': 'string',
  'image?': ProfilePicture.or('null'),
})

/** Your profile after a change. `imageUrl` is absent when you have no picture. */
export const MyProfile = type({ name: 'string', 'imageUrl?': 'string' })
