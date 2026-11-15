import type { WorkerBindings } from '#/server/env'

/** Origins Better Auth accepts state-changing requests from (its CSRF check). */
export class AuthOrigins {
  /**
   * The app's own origin, plus any extras from `BETTER_AUTH_TRUSTED_ORIGINS`
   * (comma separated, e.g. a preview deployment). Invalid entries, and paths,
   * are dropped; only exact `http(s)` origins are kept.
   */
  static trusted(env: Pick<WorkerBindings, 'BETTER_AUTH_URL' | 'BETTER_AUTH_TRUSTED_ORIGINS'>): string[] {
    const candidates = [env.BETTER_AUTH_URL, ...(env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',') ?? [])]
    const origins = new Set<string>()
    for (const candidate of candidates) {
      const origin = AuthOrigins.toOrigin(candidate)
      if (origin) origins.add(origin)
    }
    return [...origins]
  }

  private static toOrigin(value: string | undefined): string | null {
    const trimmed = value?.trim()
    if (!trimmed) return null
    try {
      const url = new URL(trimmed)
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null
    } catch {
      return null
    }
  }
}
