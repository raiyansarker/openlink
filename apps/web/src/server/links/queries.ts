import { link } from '@openlink/db/schema'
import { and, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lte, ne, not, or, type SQL } from 'drizzle-orm'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { contains } from '#/server/sql/contains'

export type LinkStatusFilter = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'disabled'

export const DEFAULT_LINK_PAGE = 50
export const MAX_LINK_PAGE = 200

const like = contains

/**
 * SQL equivalent of `deriveLinkStatus`, so filtering and the status shown in
 * the API always agree. `links/queries.test.ts` checks the two against each other.
 */
export function statusCondition(status: LinkStatusFilter, now: Date): SQL {
  const inactive = or(eq(link.enabled, false), inArray(link.status, ['disabled', 'paused']))!
  const live = not(inactive)
  const started = or(isNull(link.activateAt), lte(link.activateAt, now))!
  const exhausted = and(isNotNull(link.maxClicks), gte(link.clickCount, link.maxClicks))
  const expired = and(started, or(and(isNotNull(link.expiresAt), lte(link.expiresAt, now)), exhausted))!
  const running = and(live, started, not(expired))!
  switch (status) {
    case 'paused':
      return eq(link.status, 'paused')
    case 'disabled':
      return and(inactive, ne(link.status, 'paused'))!
    case 'scheduled':
      return and(live, isNotNull(link.activateAt), gt(link.activateAt, now))!
    case 'expired':
      return and(live, expired)!
    case 'draft':
      return and(running, eq(link.status, 'draft'))!
    case 'active':
      return and(running, ne(link.status, 'draft'))!
  }
}

export type OrganizationLinkQuery = {
  organizationId: string
  q?: string
  /** A folder id, or `root` for links that are not in a folder. */
  folderId?: string
  tag?: string
  status?: LinkStatusFilter
  limit?: number
  offset?: number
  now?: Date
}

export function queryOrganizationLinks(input: OrganizationLinkQuery) {
  return Effect.gen(function* () {
    const db = yield* Db
    const now = input.now ?? new Date()
    const q = input.q?.trim()
    const tag = input.tag?.trim()
    const filters = [
      eq(link.organizationId, input.organizationId),
      q
        ? or(like(link.slug, q), like(link.title, q), like(link.destinationUrl, q), like(link.description, q))
        : undefined,
      input.folderId === 'root'
        ? isNull(link.folderId)
        : input.folderId
          ? eq(link.folderId, input.folderId)
          : undefined,
      // Tags are stored as a JSON array; match the quoted element.
      tag ? like(link.tagsJson, JSON.stringify(tag)) : undefined,
      input.status ? statusCondition(input.status, now) : undefined,
    ]
    const where = and(...filters)
    const limit = Math.min(Math.max(input.limit ?? DEFAULT_LINK_PAGE, 1), MAX_LINK_PAGE)
    const offset = Math.max(input.offset ?? 0, 0)

    const items = yield* operation('links.queryOrganization', () =>
      db.select().from(link).where(where).orderBy(desc(link.createdAt), desc(link.id)).limit(limit).offset(offset),
    )
    const [totals] = yield* operation('links.countOrganization', () =>
      db.select({ total: count() }).from(link).where(where),
    )
    return { items, total: totals?.total ?? 0 }
  })
}

