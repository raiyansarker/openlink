import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { organization } from './orgs'

/**
 * Workspace API keys, managed by the Better Auth API key plugin (`@better-auth/api-key`).
 * Keys are organization-owned: `referenceId` is the workspace id. Only a hash of the
 * secret is stored in `key`. The key's workspace role lives in `permissions`.
 */
export const apikey = sqliteTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    configId: text('config_id').notNull().default('default'),
    name: text('name'),
    /** Leading characters of the secret, safe to display. */
    start: text('start'),
    referenceId: text('reference_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    prefix: text('prefix'),
    key: text('key').notNull(),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: integer('last_refill_at', { mode: 'timestamp_ms' }),
    enabled: integer('enabled', { mode: 'boolean' }).default(true),
    rateLimitEnabled: integer('rate_limit_enabled', { mode: 'boolean' }).default(true),
    rateLimitTimeWindow: integer('rate_limit_time_window'),
    rateLimitMax: integer('rate_limit_max'),
    requestCount: integer('request_count').default(0),
    remaining: integer('remaining'),
    lastRequest: integer('last_request', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    permissions: text('permissions'),
    metadata: text('metadata'),
  },
  (table) => [
    index('apikey_key_idx').on(table.key),
    index('apikey_reference_idx').on(table.referenceId),
    index('apikey_config_idx').on(table.configId),
  ],
)
