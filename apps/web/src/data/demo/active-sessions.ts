export type DeviceKind = 'all-in-one' | 'laptop' | 'smartphone'

export type ActiveSession = {
  id: string
  kind: DeviceKind
  name: string
  /** Browser or app the session runs in. */
  client: string
  os: string
  city: string
  country: string
  /** Approximate location from IP; never precise GPS. */
  coordinates: { lat: number; lng: number }
  /** Documentation-range IPs (RFC 5737) for the demo. */
  ipAddress: string
  signInMethod: string
  signedInAt: string
  lastActiveAt: string
  isCurrent: boolean
}

const MINUTE = 60_000

/** Demo timestamps stay relative to now so "last active" always reads sensibly. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString()
}

export const DEMO_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 'current',
    kind: 'all-in-one',
    name: 'This Mac',
    client: 'Safari 19',
    os: 'macOS 26',
    city: 'San Francisco',
    country: 'United States',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    ipAddress: '203.0.113.24',
    signInMethod: 'Passkey',
    signedInAt: minutesAgo(60 * 24 * 11),
    lastActiveAt: minutesAgo(1),
    isCurrent: true,
  },
  {
    id: 'laptop',
    kind: 'laptop',
    name: 'MacBook Pro',
    client: 'Chrome 142',
    os: 'macOS 26',
    city: 'Dhaka',
    country: 'Bangladesh',
    coordinates: { lat: 23.8103, lng: 90.4125 },
    ipAddress: '198.51.100.73',
    signInMethod: 'Google',
    signedInAt: minutesAgo(60 * 24 * 23),
    lastActiveAt: minutesAgo(120),
    isCurrent: false,
  },
  {
    id: 'phone',
    kind: 'smartphone',
    name: 'iPhone 17 Pro',
    client: 'OpenLink iOS 2.4',
    os: 'iOS 26',
    city: 'Dhaka',
    country: 'Bangladesh',
    coordinates: { lat: 23.7808, lng: 90.4219 },
    ipAddress: '198.51.100.12',
    signInMethod: 'Email link',
    signedInAt: minutesAgo(60 * 24 * 44),
    lastActiveAt: minutesAgo(60 * 26),
    isCurrent: false,
  },
  {
    id: 'office',
    kind: 'all-in-one',
    name: 'Office iMac',
    client: 'Firefox 145',
    os: 'macOS 15',
    city: 'London',
    country: 'United Kingdom',
    coordinates: { lat: 51.5072, lng: -0.1276 },
    ipAddress: '192.0.2.140',
    signInMethod: 'Password',
    signedInAt: minutesAgo(60 * 24 * 91),
    lastActiveAt: minutesAgo(60 * 24 * 9),
    isCurrent: false,
  },
]
