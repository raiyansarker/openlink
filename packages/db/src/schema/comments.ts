import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { link } from './links'
import { organization } from './orgs'

export const linkComment = sqliteTable(
  'link_comment',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    linkId: text('link_id')
      .notNull()
      .references(() => link.id, { onDelete: 'cascade' }),
    authorUserId: text('author_user_id').references(() => user.id, { onDelete: 'set null' }),
    /** Snapshot so the thread still reads correctly after the author leaves. */
    authorLabel: text('author_label').notNull(),
    body: text('body').notNull(),
    /** `{ "👍": ["userId", …] }` */
    reactionsJson: text('reactions_json').notNull().default('{}'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    editedAt: integer('edited_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('link_comment_link_idx').on(table.linkId, table.createdAt)],
)
