/** What we record about where and how a session started. */
export type SessionOrigin = {
  city: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  signInMethod: string | null
}

type CloudflareLocation = { city?: unknown; country?: unknown; latitude?: unknown; longitude?: unknown }

/** Derives a session's location (from Cloudflare's request data) and sign-in method (from the auth route). */
export class SessionOriginReader {
  private static readonly METHODS = new Set(['google', 'github'])

  static read(input: { cf?: CloudflareLocation | null; path?: string; providerId?: unknown }): SessionOrigin {
    const cf = input.cf ?? {}
    const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, 100) : null)
    const coordinate = (value: unknown, limit: number) => {
      const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
      return Number.isFinite(n) && Math.abs(n) <= limit ? n : null
    }
    const latitude = coordinate(cf.latitude, 90)
    const longitude = coordinate(cf.longitude, 180)
    return {
      city: text(cf.city),
      country: text(cf.country),
      // A half-known position is worse than none on a map.
      latitude: latitude !== null && longitude !== null ? latitude : null,
      longitude: latitude !== null && longitude !== null ? longitude : null,
      signInMethod: SessionOriginReader.method(input.path, input.providerId),
    }
  }

  private static method(path: string | undefined, providerId: unknown): string | null {
    if (!path) return null
    if (path.includes('/email')) return 'email'
    if (path.startsWith('/callback')) {
      const id = typeof providerId === 'string' ? providerId : path.split('/')[2]
      return id && SessionOriginReader.METHODS.has(id) ? id : null
    }
    return null
  }
}
