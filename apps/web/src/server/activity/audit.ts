import { Effect } from 'effect'

import { WorkerRequest } from '#/server/effect/services/request'
import { recordActivityQuietly, type RecordActivityInput } from './service'

type SessionLike = {
  session: { user: { id: string; name: string; email: string } }
  /** Present when the request authenticated with an API key. */
  apiKey?: { id: string; name: string }
}

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
      source: session.apiKey ? 'api' : (event.source ?? 'dashboard'),
      actor: session.apiKey
        ? { type: 'api_key', label: `API key: ${session.apiKey.name}` }
        : { type: 'member', userId: user.id, label: user.name || user.email },
      ipAddress: request.headers.get('cf-connecting-ip'),
    })
  })
