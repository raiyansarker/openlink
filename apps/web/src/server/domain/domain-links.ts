import { customDomain, link } from '@openlink/db/schema'
import { and, count, eq, inArray, isNull, sql } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'

/** Where a domain's links can go: another of the workspace's active domains, or the app's own host (`null`). */
export type LinkMoveTarget = string | null

export class DomainMoveTargetInvalid extends Data.TaggedError('DomainMoveTargetInvalid')<{ message: string }> {}

/** Some back-halves are already taken where the links would go. */
export class DomainLinksConflict extends Data.TaggedError('DomainLinksConflict')<{
  /** A few of the clashing back-halves, to show. */
  slugs: string[]
  total: number
}> {}

/**
 * A custom domain's links: how many there are, and moving them all to another
 * domain (e.g. before the domain is removed, which would otherwise delete them).
 */
export class DomainLinks {
  /** How many clashing back-halves to name in an error. */
  static readonly CONFLICTS_SHOWN = 5

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

  /**
   * Moves every link of `fromDomainId` to `to`, keeping back-halves. Fails if
   * the target isn't one of the workspace's active domains, or if any
   * back-half is already used there; nothing moves in either case.
   * Resolves to how many links moved.
   */
  static moveAll(input: { organizationId: string; fromDomainId: string; to: LinkMoveTarget }) {
    return Effect.gen(function* () {
      const db = yield* Db
      if (input.to !== null) {
        if (input.to === input.fromDomainId) {
          return yield* Effect.fail(new DomainMoveTargetInvalid({ message: 'Choose a different domain to move the links to.' }))
        }
        const [target] = yield* operation('domain.moveTarget', () =>
          db
            .select({ readiness: customDomain.readiness })
            .from(customDomain)
            .where(and(eq(customDomain.id, input.to!), eq(customDomain.organizationId, input.organizationId)))
            .limit(1),
        )
        if (!target) return yield* Effect.fail(new DomainMoveTargetInvalid({ message: 'That domain is not in this workspace.' }))
        if (target.readiness !== 'active') {
          return yield* Effect.fail(
            new DomainMoveTargetInvalid({ message: 'Links can only move to a domain that is set up and active.' }),
          )
        }
      }

      // One statement each (D1 caps bound parameters at 100, so never a list of slugs).
      const sourceSlugs = db
        .select({ slug: link.slug })
        .from(link)
        .where(and(eq(link.organizationId, input.organizationId), eq(link.domainId, input.fromDomainId)))
      // The app host's back-halves are shared by every workspace, so check them all.
      const atTarget = input.to === null ? isNull(link.domainId) : eq(link.domainId, input.to)
      const clashes = yield* operation('domain.moveConflicts', () =>
        db.select({ slug: link.slug }).from(link).where(and(atTarget, inArray(link.slug, sourceSlugs))).orderBy(link.slug),
      )
      if (clashes.length > 0) {
        return yield* Effect.fail(
          new DomainLinksConflict({ slugs: clashes.slice(0, DomainLinks.CONFLICTS_SHOWN).map((row) => row.slug), total: clashes.length }),
        )
      }

      const moved = yield* operation('domain.moveLinks', () =>
        db
          .update(link)
          .set({ domainId: input.to, updatedAt: new Date() })
          .where(and(eq(link.organizationId, input.organizationId), eq(link.domainId, input.fromDomainId)))
          .returning({ id: link.id }),
      )
      return moved.length
    })
  }
}
