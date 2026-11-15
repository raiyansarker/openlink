import { Effect } from 'effect'

import { Bindings } from '../effect/services/bindings'
import { SocialProviders } from './providers'
import { Onboarding } from './onboarding'
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
      // If the onboarding lookup fails, treat the person as not yet onboarded:
      // the onboarding page lets them continue, rather than letting them past it.
      const onboarded = session
        ? yield* Onboarding.isComplete(session.session.user.id).pipe(Effect.orElseSucceed(() => false))
        : false
      return {
        user: session
          ? {
              id: session.session.user.id,
              name: session.session.user.name,
              email: session.session.user.email,
              image: session.session.user.image ?? null,
              onboarded,
            }
          : null,
        providers: SocialProviders.enabled(bindings),
        emailPassword: bindings.EMAIL_PASSWORD_SIGN_IN === 'true',
      }
    })
  }
}
