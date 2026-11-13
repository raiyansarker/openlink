import { and, eq, isNull } from 'drizzle-orm'
import { organizationInvite } from '@openlink/db/schema'
import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { hashInviteToken } from './invite-tokens'

export {
  createInviteToken,
  hashInviteToken,
  inviteEmailMatches,
} from './invite-tokens'

export function findBootstrapInviteByToken(token: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const tokenHash = hashInviteToken(token)
    const [invite] = yield* operation('org.findBootstrapInviteByToken', () =>
      db
        .select()
        .from(organizationInvite)
        .where(
          and(
            eq(organizationInvite.kind, 'bootstrap'),
            eq(organizationInvite.tokenHash, tokenHash),
            isNull(organizationInvite.acceptedAt),
          ),
        )
        .limit(1),
    )

    return invite ?? null
  })
}
