import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { link } from './links'
import { organization } from './orgs'

/**
 * One counted visit to a short link, for workspace analytics. Holds no IP
 * address or user agent: the visitor is a salted hash, used only to count
 * unique visitors.
 */
export const linkClick = sqliteTable(
  'link_click',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    linkId: text('link_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    /** Null for the app's own host. */
    domainId: text('domain_id'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    visitorHash: text('visitor_hash').notNull(),
    /** direct, social, search, email, qr or referral. */
    channel: text('channel').notNull(),
    referrerHost: text('referrer_host'),
    /** ISO 3166-1 alpha-2. */
    country: text('country'),
    city: text('city'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    /** mobile, tablet or desktop. */
    device: text('device').notNull(),
    browser: text('browser').notNull(),
    os: text('os').notNull(),
    /** redirect or cloak. */
    delivery: text('delivery').notNull(),
    destinationHost: text('destination_host'),
  },
  (table) => [
    index('link_click_org_time_idx').on(table.organizationId, table.occurredAt),
    index('link_click_link_time_idx').on(table.linkId, table.occurredAt),
  ],
)
