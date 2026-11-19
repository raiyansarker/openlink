import { Effect } from 'effect'

import { toMyInviteDto } from '#/server/api/serializers'
import { Db } from '#/server/effect/services/db'
import { WorkerRequest } from '#/server/effect/services/request'
import { readSessionEffect } from '#/server/effect/session'
import { findInviteForEmail } from '#/server/org/service'

import { checkInvitee } from './invite-guard'

/** Invite ids are UUIDs; anything else is not worth a database lookup. */
const INVITE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * What `/invite/<id>` shows, decided on the server:
 * - `signed_out`: the same for every id, so the page never says whether one exists;
 * - `pending`: the invite, only for the signed-in address it was sent to;
 * - `accepted`: already used by that address (the page moves on to the app);
 * - `not_found`: anything else (someone else's, revoked, declined, expired, unknown,
 *   unverified address), alike;
 * - `rate_limited`: too many lookups by this person.
 */
export type InvitePageState =
  | { status: 'signed_out' }
  | { status: 'not_found' }
  | { status: 'rate_limited' }
  | { status: 'accepted' }
  | { status: 'pending'; invite: ReturnType<typeof toMyInviteDto> }

export function readInvitePage(inviteId: string) {
  return Effect.gen(function* () {
    const session = yield* readSessionEffect.pipe(Effect.catch(() => Effect.succeed(null)))
    if (!session) return { status: 'signed_out' } satisfies InvitePageState as InvitePageState
    if (!INVITE_ID.test(inviteId)) return { status: 'not_found' } as InvitePageState
    const failure = yield* checkInvitee(yield* Db, session.session.user)
    if (failure) return { status: failure } as InvitePageState
    const found = yield* findInviteForEmail({ inviteId, email: session.session.user.email }).pipe(Effect.catch(() => Effect.succeed(null)))
    if (!found) return { status: 'not_found' } as InvitePageState
    return found.status === 'accepted'
      ? ({ status: 'accepted' } as InvitePageState)
      : ({ status: 'pending', invite: toMyInviteDto(found.row) } as InvitePageState)
  })
}

/** Run with the incoming request, for the page's server function. */
export const readInvitePageFor = (request: Request, inviteId: string) =>
  readInvitePage(inviteId).pipe(Effect.provideService(WorkerRequest, request))
