import { link } from '@openlink/db/schema'
import { and, count, eq, sql } from 'drizzle-orm'
import { Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'

/** How many links each custom domain has (removing a domain deletes them). */
export class DomainLinks {
  /** Link count per domain id, for every domain of the workspace that has links. */
  static counts(organizationId: string) {
    return Effect.gen(function* () {
      const db = yield* Db
      const rows = yield* operation('domain.linkCounts', () =>
        db
          .select({ domainId: link.domainId, links: count() })
          .from(link)
          .where(and(eq(link.organizationId, organizationId), sql`${link.domainId} is not null`))
          .groupBy(link.domainId),
      )
      return new Map(rows.map((row) => [row.domainId!, Number(row.links)]))
    })
  }

  static countFor(organizationId: string, domainId: string) {
    return DomainLinks.counts(organizationId).pipe(Effect.map((counts) => counts.get(domainId) ?? 0))
  }
}
