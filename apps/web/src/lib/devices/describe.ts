import type { DeviceSession } from '#/lib/api/types'
import { UserAgent, type DeviceKind } from './user-agent'

/**
 * A signed-in device as the Devices screen shows it: the browser and OS read
 * from the user agent, the country as a name, the sign-in method as a word.
 * Location is left out when unknown rather than guessed.
 */
export type DeviceView = {
  id: string
  kind: DeviceKind
  name: string
  client: string
  os: string
  city?: string
  country?: string
  coordinates?: { lat: number; lng: number }
  ipAddress: string
  signInMethod: string
  signedInAt: string
  lastActiveAt: string
  isCurrent: boolean
}

const METHOD_LABEL: Record<string, string> = { google: 'Google', github: 'GitHub', email: 'Email and password', passkey: 'Passkey' }
const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

/** `BD` → `Bangladesh`; anything unrecognised is shown as given. */
export function countryName(code: string) {
  try {
    return (code.length === 2 && regionNames?.of(code.toUpperCase())) || code
  } catch {
    return code
  }
}

export function describeDeviceSession(row: DeviceSession): DeviceView {
  const device = UserAgent.describe(row.userAgent)
  return {
    id: row.id,
    kind: device.kind,
    name: `${device.client.replace(/ \d+$/, '')} on ${device.os}`,
    client: device.client,
    os: device.os,
    ...(row.city ? { city: row.city } : {}),
    ...(row.country ? { country: countryName(row.country) } : {}),
    ...(row.latitude !== undefined && row.longitude !== undefined ? { coordinates: { lat: row.latitude, lng: row.longitude } } : {}),
    ipAddress: row.ipAddress ?? 'Unknown',
    signInMethod: (row.signInMethod && METHOD_LABEL[row.signInMethod]) || 'Unknown',
    signedInAt: row.signedInAt,
    lastActiveAt: row.lastActiveAt,
    isCurrent: row.current,
  }
}
