import { and, eq } from 'drizzle-orm'
import { organizationMember } from '@openlink/db/schema'
import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'

export function getMembership(userId: string, organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('org.getMembership', () =>
      db
        .select()
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.userId, userId),
            eq(organizationMember.organizationId, organizationId),
          ),
        )
        .limit(1),
    )

    return row ?? null
  })
}

export { isAdmin, canManageLinks } from './permissions'
