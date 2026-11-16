import type { link } from '@openlink/db/schema'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'

type LinkRow = typeof link.$inferSelect

/** Anything with Cloudflare's rate-limit binding shape. */
export type AttemptLimiter = { limit(options: { key: string }): Promise<{ success: boolean }> }

/**
 * Guards password-protected links. Nothing is remembered: every visit asks for
 * the password again, and attempts are capped per link and client IP.
 */
export class PasswordGate {
  /**
   * Count a password attempt against this link and client. False means too
   * many recently. A limiter outage never locks people out.
   */
  static allowAttempt(limiter: AttemptLimiter | undefined, row: Pick<LinkRow, 'id'>, clientIp: string | null) {
    if (!limiter) return Effect.succeed(true)
    return operation('redirect.passwordLimit', () => limiter.limit({ key: `${row.id}:${clientIp ?? 'unknown'}` })).pipe(
      Effect.map((outcome) => outcome.success),
      Effect.orElseSucceed(() => true),
    )
  }
}
