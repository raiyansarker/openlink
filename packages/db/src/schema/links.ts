import { sql } from 'drizzle-orm'
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { customDomain } from './domains'
import { organization } from './orgs'

export const linkFolder = sqliteTable(
  'link_folder',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    /** Null means the workspace root. Nesting depth is enforced by the service. */
    parentId: text('parent_id').references((): AnySQLiteColumn => linkFolder.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('link_folder_org_idx').on(table.organizationId, table.parentId)],
)

export const link = sqliteTable(
  'link',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    /** Null means the app's own host, which every workspace shares. */
    domainId: text('domain_id').references(() => customDomain.id, { onDelete: 'cascade' }),
    folderId: text('folder_id').references(() => linkFolder.id, { onDelete: 'set null' }),
    slug: text('slug').notNull(),
    alias: text('alias'),
    title: text('title'),
    description: text('description'),
    destinationUrl: text('destination_url').notNull(),
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
    /** Hold, targeting, cloaking and social preview, as one JSON object (see `LinkDelivery`). */
    deliveryJson: text('delivery_json'),
    createdByUserId: text('created_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('link_domain_slug_unique').on(table.domainId, table.slug),
    // SQLite treats NULLs as distinct, so app-host slugs need their own index to stay unique.
    uniqueIndex('link_default_slug_unique').on(table.slug).where(sql`${table.domainId} IS NULL`),
    index('link_org_idx').on(table.organizationId),
    index('link_folder_idx').on(table.folderId),
  ],
)
