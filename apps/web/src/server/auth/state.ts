import { Effect } from 'effect'

import { Bindings } from '../effect/services/bindings'
import { SocialProviders } from './providers'
import { requireSession } from './session'

/** What the browser needs to choose between the dashboard and the login page. */
export class AuthStateReader {
  /**
   * If auth itself is unavailable the caller is treated as signed out rather
   * than failing the page render. Only the fields the UI needs are returned.
   */
  static read(request: Request) {
    return Effect.gen(function* () {
      const bindings = yield* Bindings
      const session = yield* requireSession(request).pipe(
        Effect.catch((error) =>
          Effect.logWarning(`auth state unavailable: ${String(error.cause)}`).pipe(Effect.as(null)),
        ),
      )
      return {
        user: session
          ? {
              id: session.session.user.id,
              name: session.session.user.name,
              email: session.session.user.email,
              image: session.session.user.image ?? null,
            }
          : null,
        providers: SocialProviders.enabled(bindings),
      }
    })
  }
}
