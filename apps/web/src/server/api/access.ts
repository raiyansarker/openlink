import { and, eq } from 'drizzle-orm'
import { customDomain } from '@openlink/db/schema'
import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { getMembership } from '../org/access'

export function requireOrgMembership(userId: string, organizationId: string) {
  return Effect.gen(function* () {
    return yield* getMembership(userId, organizationId)
  })
}

export function getDomainInOrganization(
  domainId: string,
  organizationId: string,
) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('access.getDomainInOrganization', () =>
      db
        .select()
        .from(customDomain)
        .where(
          and(
            eq(customDomain.id, domainId),
            eq(customDomain.organizationId, organizationId),
          ),
        )
        .limit(1),
    )

    return row ?? null
  })
}
