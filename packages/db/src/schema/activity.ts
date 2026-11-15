import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { organization } from './orgs'

/**
 * Append-only audit trail. Drives the workspace activity feed and the per-link
 * history, so the actor and target labels are snapshotted: the feed must keep
 * reading correctly after a member leaves or a link is deleted.
 */
export const activityEvent = sqliteTable(
  'activity_event',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    actorType: text('actor_type', { enum: ['member', 'api_key', 'system'] }).notNull(),
    actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'set null' }),
    actorLabel: text('actor_label').notNull(),
    /** Machine key such as `link.created`; presentation is derived from it. */
    action: text('action').notNull(),
    category: text('category', {
      enum: ['links', 'domains', 'members', 'security', 'developers'],
    }).notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    targetLabel: text('target_label').notNull(),
    source: text('source', { enum: ['dashboard', 'api', 'automation'] })
      .notNull()
      .default('dashboard'),
    detailsJson: text('details_json'),
    ipAddress: text('ip_address'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('activity_org_created_idx').on(table.organizationId, table.createdAt),
    index('activity_target_idx').on(table.targetType, table.targetId, table.createdAt),
  ],
)
