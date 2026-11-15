import type { ActiveSession } from '#/data/demo/active-sessions'
import { ApiClient, type OpenLinkClient } from '#/lib/api/client'
import { ApiError } from '#/lib/api/error'
import { UserAgent } from './user-agent'

type DeviceSessionDto = Awaited<ReturnType<OpenLinkClient['account']['listDeviceSessions']>>['items'][number]

const METHOD_LABEL: Record<string, string> = { google: 'Google', github: 'GitHub', email: 'Email and password' }
const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

/** API sessions → the shape the Devices screen renders. */
export class DeviceSessionMapper {
  static toActiveSession(row: DeviceSessionDto): ActiveSession {
    const device = UserAgent.describe(row.userAgent)
    return {
      id: row.id,
      kind: device.kind,
      name: `${device.client.replace(/ \d+$/, '')} on ${device.os}`,
      client: device.client,
      os: device.os,
      ...(row.city ? { city: row.city } : {}),
      ...(row.country ? { country: DeviceSessionMapper.countryName(row.country) } : {}),
      ...(row.latitude !== undefined && row.longitude !== undefined ? { coordinates: { lat: row.latitude, lng: row.longitude } } : {}),
      ipAddress: row.ipAddress ?? 'Unknown',
      signInMethod: (row.signInMethod && METHOD_LABEL[row.signInMethod]) || 'Unknown',
      signedInAt: row.signedInAt,
      lastActiveAt: row.lastActiveAt,
      isCurrent: row.current,
    }
  }

  /** `BD` → `Bangladesh`; anything unrecognised is shown as given. */
  static countryName(code: string) {
    try {
      return (code.length === 2 && regionNames?.of(code.toUpperCase())) || code
    } catch {
      return code
    }
  }
}

/** The signed-in person's devices. */
export class DevicesApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async list(): Promise<ActiveSession[]> {
    const { items } = await this.client.account.listDeviceSessions()
    return items.map(DeviceSessionMapper.toActiveSession)
  }

  async signOut(sessionId: string): Promise<void> {
    try {
      await this.client.account.revokeDeviceSession({ params: { sessionId } })
    } catch (error) {
      throw ApiError.from(error, 'Could not sign out that device.')
    }
  }

  async signOutOthers(): Promise<number> {
    try {
      return (await this.client.account.revokeOtherDeviceSessions()).revoked
    } catch (error) {
      throw ApiError.from(error, 'Could not sign out your other devices.')
    }
  }
}
