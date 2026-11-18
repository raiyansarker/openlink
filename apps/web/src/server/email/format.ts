import { countryName } from '#/lib/devices/describe'
import { UserAgent } from '#/lib/devices/user-agent'

/** Turns raw values into the text emails show. Times are UTC because the recipient's zone is unknown. */
export class EmailFormat {
  /** `December 12, 2026` */
  static date(value: Date) {
    return value.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  }

  /** `December 5, 2026 at 10:42 AM UTC` */
  static dateTime(value: Date) {
    const time = value.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
    return `${EmailFormat.date(value)} at ${time} UTC`
  }

  /** `admin` becomes `Admin`. */
  static role(role: string) {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  /** `Safari on macOS`, or `Unknown device` when there is no user agent. */
  static device(userAgent: string | null | undefined) {
    if (!userAgent) return 'Unknown device'
    const { client, os } = UserAgent.describe(userAgent)
    return `${client.replace(/ \d+$/, '')} on ${os}`
  }

  /** `San Francisco, United States`, leaving out whatever Cloudflare did not report. */
  static location(cf: { city?: unknown; country?: unknown } | null | undefined) {
    const city = typeof cf?.city === 'string' ? cf.city : ''
    const country = typeof cf?.country === 'string' && cf.country ? countryName(cf.country) : ''
    return [city, country].filter(Boolean).join(', ') || 'Unknown location'
  }
}
