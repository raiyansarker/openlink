import { Effect } from 'effect'
import { Auth } from '../effect/services/auth'
import { operation } from '../effect/operations'
import { toUserDto } from '../api/serializers'

export function requireSession(request: Request) {
  return Effect.gen(function* () {
    const auth = yield* Auth
    const session = yield* operation('auth.getSession', () =>
      auth.api.getSession({ headers: request.headers }),
    )
    if (!session?.user) return null
    return {
      session,
      user: toUserDto({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        createdAt: new Date(session.user.createdAt),
      }),
    }
  })
}
