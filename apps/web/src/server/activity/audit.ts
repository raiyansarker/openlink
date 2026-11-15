import { Effect } from 'effect'

import { WorkerRequest } from '#/server/effect/services/request'
import { recordActivityQuietly, type RecordActivityInput } from './service'

type SessionLike = { session: { user: { id: string; name: string; email: string } } }

/** Record an event on behalf of the signed-in member, capturing the request IP. */
export const audit = (
  session: SessionLike,
  event: Omit<RecordActivityInput, 'actor' | 'ipAddress'>,
) =>
  Effect.gen(function* () {
    const request = yield* WorkerRequest
    const user = session.session.user
    yield* recordActivityQuietly({
      ...event,
      actor: { type: 'member', userId: user.id, label: user.name || user.email },
      ipAddress: request.headers.get('cf-connecting-ip'),
    })
  })
