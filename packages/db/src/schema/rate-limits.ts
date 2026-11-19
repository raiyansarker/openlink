import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Fixed-window counters for rate limits (sign-in attempts, outgoing email, ...).
 * One row per key and window; `count` is incremented atomically on each attempt.
 */
export const rateLimit = sqliteTable(
  'rate_limit',
  {
    /** SHA-256 of `<scope>:<subject>` (it can hold an email address or IP), then `:<window seconds>`. */
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    /** Start of the current window, in ms. A new window resets `count`. */
    windowStart: integer('window_start').notNull(),
    /** When the row stops mattering; an hourly cron deletes expired rows. */
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [index('rate_limit_expires_at_idx').on(table.expiresAt)],
)
