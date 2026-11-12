import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { customDomain } from './domains'
import { organization } from './orgs'

export const link = sqliteTable(
  'link',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    domainId: text('domain_id')
      .notNull()
      .references(() => customDomain.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    alias: text('alias'),
    title: text('title'),
    description: text('description'),
    destinationUrl: text('destination_url').notNull(),
    redirectStatus: integer('redirect_status').notNull().default(302),
    status: text('status', {
      enum: ['draft', 'scheduled', 'active', 'paused', 'expired', 'disabled'],
    })
      .notNull()
      .default('active'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    activateAt: integer('activate_at', { mode: 'timestamp_ms' }),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
    maxClicks: integer('max_clicks'),
    clickCount: integer('click_count').notNull().default(0),
    passwordHash: text('password_hash'),
    expiredDestinationUrl: text('expired_destination_url'),
    fallbackDestinationUrl: text('fallback_destination_url'),
    tagsJson: text('tags_json').notNull().default('[]'),
    utmJson: text('utm_json'),
    metadataJson: text('metadata_json'),
    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('link_domain_slug_unique').on(table.domainId, table.slug),
    index('link_org_idx').on(table.organizationId),
  ],
)
