import type { AuthState } from './types'

/**
 * Route guards run on every navigation. This keeps one in-flight or recent
 * lookup for `ttlMs`, so moving around the dashboard doesn't hit the server each
 * time. Sign-in and sign-out call `clear()`. The server still re-checks the
 * session on every API request, so a stale entry only affects redirects.
 *
 * Pass `enabled: false` on the server: a cache there would be shared by every
 * visitor, and would serve one person's session to another.
 */
export class AuthStateCache {
  private entry: { at: number; value: Promise<AuthState> } | null = null
  private readonly ttlMs: number
  private readonly now: () => number
  private readonly enabled: boolean

  constructor(
    private readonly load: () => Promise<AuthState>,
    options: { ttlMs?: number; now?: () => number; enabled?: boolean } = {},
  ) {
    this.ttlMs = options.ttlMs ?? 30_000
    this.now = options.now ?? Date.now
    this.enabled = options.enabled ?? true
  }

  get(): Promise<AuthState> {
    if (!this.enabled) return this.load()
    if (this.entry && this.now() - this.entry.at < this.ttlMs) return this.entry.value
    const value = this.load()
    const current = { at: this.now(), value }
    this.entry = current
    // A failed lookup must not stay cached.
    value.catch(() => {
      if (this.entry === current) this.entry = null
    })
    return value
  }

  clear(): void {
    this.entry = null
  }
}
