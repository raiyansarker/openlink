import type { BetterAuthOptions } from 'better-auth'
import type { OpenLinkDb } from '@openlink/db'

import { ServerLog } from '../observability/server-log'
import { RateLimiter } from '../rate-limit/limiter'

type RateLimitOptions = NonNullable<BetterAuthOptions['rateLimit']>

/**
 * Per client IP, per endpoint, on `/api/auth/*`. Endpoints that send email or check a
 * password are tight; everything else keeps Better Auth's default (100 per 10 seconds).
 * Outgoing email has its own per-address limits on top of these (see `email/limits.ts`).
 */
const RULES: NonNullable<RateLimitOptions['customRules']> = {
  '/sign-in/email': { window: 60, max: 5 },
  '/sign-up/email': { window: 60, max: 3 },
  '/send-verification-email': { window: 60, max: 2 },
  '/request-password-reset': { window: 60, max: 2 },
  '/reset-password': { window: 60, max: 5 },
  '/verify-email': { window: 60, max: 10 },
}

/**
 * Better Auth's limiter, stored in D1 so the count is shared by every Worker
 * isolate (its default in-memory store is per isolate). On in every environment. Locally
 * there is no `cf-connecting-ip`, so all requests share one bucket per endpoint. If D1 fails, requests are let through rather
 * than locking everyone out of sign-in; email still has its own limits.
 */
export function authRateLimit(db: () => OpenLinkDb): RateLimitOptions {
  const limiter = new RateLimiter(db)
  return {
    enabled: true,
    window: 10,
    max: 100,
    customRules: RULES,
    customStorage: {
      async consume(key, rule) {
        try {
          const decision = await limiter.consume([{ key: `auth:${key}`, rules: [rule] }])
          return { allowed: decision.allowed, retryAfter: decision.retryAfter }
        } catch (error) {
          ServerLog.error('auth.rate_limit_failed', error)
          return { allowed: true, retryAfter: null }
        }
      },
    },
  }
}
