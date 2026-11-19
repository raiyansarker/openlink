import type { OpenLinkDb } from '@openlink/db'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { requireAuthSession } from '#/server/effect/session'
import { ServerLog } from '#/server/observability/server-log'
import { RateLimiter } from '#/server/rate-limit/limiter'

/** Invite lookups and answers per signed-in user: plenty for a person, too few to probe ids. */
const INVITE_RULES = [
  { window: 60, max: 20 },
  { window: 60 * 60, max: 200 },
]

export type InviteGuardFailure = 'not_found' | 'rate_limited'

/**
 * Who may look at or answer an invite: a signed-in person with a verified address (an
 * invite is matched on email, so the address must be proven), within the per-user limit.
 * Failing the limiter refuses rather than lets a prober through.
 */
export const requireInvitee = Effect.gen(function* () {
  const session = yield* requireAuthSession
  const failure = yield* checkInvitee(yield* Db, session.session.user)
  return failure ? { ok: false as const, failure, session } : { ok: true as const, session }
})

/** Why this person may not touch invites right now, or null when they may. */
export function checkInvitee(db: OpenLinkDb, user: { id: string; emailVerified: boolean }) {
  return Effect.gen(function* () {
    if (!user.emailVerified) return 'not_found' as InviteGuardFailure
    const allowed = yield* Effect.tryPromise(() => new RateLimiter(() => db).consume([{ key: `invite:user:${user.id}`, rules: INVITE_RULES }])).pipe(
      Effect.map((decision) => decision.allowed),
      Effect.catch((error) => Effect.sync(() => (ServerLog.error('invite.rate_limit_failed', error), false))),
    )
    return allowed ? null : ('rate_limited' as InviteGuardFailure)
  })
}
