import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { organization } from './orgs'

export const customDomain = sqliteTable(
  'custom_domain',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    hostname: text('hostname').notNull(),
    readiness: text('readiness', {
      enum: ['pending', 'verifying', 'active', 'failed', 'removing'],
    })
      .notNull()
      .default('pending'),
    provider: text('provider', { enum: ['memory', 'cloudflare'] }).notNull(),
    providerDomainId: text('provider_domain_id'),
    dnsRecordsJson: text('dns_records_json').notNull().default('[]'),
    defaultRedirectStatus: integer('default_redirect_status').notNull().default(302),
    activeAt: integer('active_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('custom_domain_hostname_unique').on(table.hostname),
    index('custom_domain_org_idx').on(table.organizationId),
  ],
)
