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
