import type { OpenLinkDb } from '@openlink/db'
import { rateLimit } from '@openlink/db/schema'
import { lt, sql } from 'drizzle-orm'

/** At most `max` attempts per `window` seconds. */
export type RateRule = { window: number; max: number }

/** One limit to check: every rule applies to `key`. */
export type RateLimit = { key: string; rules: readonly RateRule[] }

export type RateDecision =
  | { allowed: true; retryAfter: null; exceeded: [] }
  | { allowed: false; retryAfter: number; /** Keys that were over a limit. */ exceeded: string[] }

/** Roughly one call in this many also deletes expired rows, so the table stays small without a cron. */
const PRUNE_EVERY = 200

/**
 * Fixed-window counters in D1. Each check is one atomic upsert, so concurrent
 * requests in different isolates or data centers all see the same count.
 * Every attempt counts, allowed or not, so hammering a limit keeps it closed.
 */
export class RateLimiter {
  constructor(
    private readonly db: () => OpenLinkDb,
    private readonly now: () => number = Date.now,
  ) {}

  /** Keys hold email addresses and IPs, so only a hash is stored. */
  private static async hash(key: string) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  private statement(storedKey: string, rule: RateRule, now: number) {
    const windowMs = rule.window * 1000
    const windowStart = Math.floor(now / windowMs) * windowMs
    return {
      windowStart,
      windowMs,
      query: this.db()
        .insert(rateLimit)
        .values({ key: `${storedKey}:${rule.window}`, count: 1, windowStart, expiresAt: windowStart + windowMs })
        .onConflictDoUpdate({
          target: rateLimit.key,
          set: {
            // Only a newer window resets the count; a request with a slightly older clock just counts.
            count: sql`CASE WHEN excluded.window_start > ${rateLimit.windowStart} THEN 1 ELSE ${rateLimit.count} + 1 END`,
            windowStart: sql`MAX(${rateLimit.windowStart}, excluded.window_start)`,
            expiresAt: sql`MAX(${rateLimit.expiresAt}, excluded.expires_at)`,
          },
        })
        .returning({ count: rateLimit.count }),
    }
  }

  /**
   * Count one attempt against every rule of every limit, in one round trip. Allowed only
   * when none is over; `retryAfter` (seconds) is the longest wait among those that are.
   */
  async consume(limits: readonly RateLimit[]): Promise<RateDecision> {
    const now = this.now()
    const hashed = await Promise.all(limits.map(async (limit) => ({ ...limit, stored: await RateLimiter.hash(limit.key) })))
    const checks = hashed.flatMap(({ key, stored, rules }) => rules.map((rule) => ({ key, rule, ...this.statement(stored, rule, now) })))
    if (checks.length === 0) return { allowed: true, retryAfter: null, exceeded: [] }
    const [first, ...rest] = checks.map((check) => check.query)
    const results = (await this.db().batch([first, ...rest])) as { count: number }[][]

    let retryAfter = 0
    const exceeded = new Set<string>()
    checks.forEach((check, i) => {
      const count = results[i]?.[0]?.count ?? Number.POSITIVE_INFINITY
      if (count <= check.rule.max) return
      exceeded.add(check.key)
      retryAfter = Math.max(retryAfter, Math.ceil((check.windowStart + check.windowMs - now) / 1000))
    })
    if (Math.random() * PRUNE_EVERY < 1) void this.prune(now).catch(() => {})
    return exceeded.size > 0
      ? { allowed: false, retryAfter: Math.max(1, retryAfter), exceeded: [...exceeded] }
      : { allowed: true, retryAfter: null, exceeded: [] }
  }

  /** Drop windows that have ended. */
  async prune(now = this.now()) {
    await this.db().delete(rateLimit).where(lt(rateLimit.expiresAt, now))
  }
}

/** The client address Cloudflare saw, if the request came through Cloudflare. */
export function clientIp(request: Request | undefined | null): string | null {
  return request?.headers.get('cf-connecting-ip')?.trim() || null
}
