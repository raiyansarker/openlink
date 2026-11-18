export type DeviceKind = 'all-in-one' | 'laptop' | 'smartphone'

export type DeviceDescription = { client: string; os: string; kind: DeviceKind }

/** A short, human description of a browser from its user agent. Best effort: unknown parts say so. */
export class UserAgent {
  private static readonly BROWSERS: [RegExp, string][] = [
    [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
    [/OPR\/(\d+)/, 'Opera'],
    [/SamsungBrowser\/(\d+)/, 'Samsung Internet'],
    [/Firefox\/(\d+)|FxiOS\/(\d+)/, 'Firefox'],
    [/Chrome\/(\d+)|CriOS\/(\d+)/, 'Chrome'],
    [/Version\/(\d+)[\d.]* .*Safari\//, 'Safari'],
  ]

  static describe(userAgent: string | null | undefined): DeviceDescription {
    const ua = userAgent ?? ''
    const os = UserAgent.os(ua)
    const mobile = /Mobile|iPhone|Android(?!.*Tablet)/.test(ua) && !/iPad/.test(ua)
    return { client: UserAgent.client(ua), os, kind: mobile ? 'smartphone' : 'laptop' }
  }

  /** The browser's name without its version, e.g. "Chrome". */
  static browser(userAgent: string | null | undefined): string {
    const ua = userAgent ?? ''
    return UserAgent.BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? 'Unknown browser'
  }

  private static client(ua: string) {
    for (const [pattern, name] of UserAgent.BROWSERS) {
      const match = pattern.exec(ua)
      if (match) {
        const version = match.slice(1).find(Boolean)
        return version ? `${name} ${version}` : name
      }
    }
    return 'Unknown browser'
  }

  private static os(ua: string) {
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS'
    if (/Android/.test(ua)) return 'Android'
    if (/Mac OS X|Macintosh/.test(ua)) return 'macOS'
    if (/Windows/.test(ua)) return 'Windows'
    if (/CrOS/.test(ua)) return 'ChromeOS'
    if (/Linux/.test(ua)) return 'Linux'
    return 'Unknown system'
  }
}
