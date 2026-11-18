export type DeviceKind = 'all-in-one' | 'laptop' | 'smartphone'

export type ActiveSession = {
  id: string
  kind: DeviceKind
  name: string
  /** Browser or app the session runs in. */
  client: string
  os: string
  /** Absent when the location is unknown. */
  city?: string
  country?: string
  /** Approximate location from IP; never precise GPS. Absent when unknown. */
  coordinates?: { lat: number; lng: number }
  /** Sign-in IP, when recorded. */
  ipAddress: string
  signInMethod: string
  signedInAt: string
  lastActiveAt: string
  isCurrent: boolean
}
