import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { organization } from './orgs'

/** Workspace-scoped credentials for the HTTP API. Only a hash of the secret is stored. */
export const apiKey = sqliteTable(
  'api_key',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Leading characters of the secret, safe to display. */
    prefix: text('prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    role: text('role', { enum: ['admin', 'member', 'viewer'] }).notNull(),
    createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('api_key_hash_unique').on(table.keyHash),
    index('api_key_org_idx').on(table.organizationId),
  ],
)
