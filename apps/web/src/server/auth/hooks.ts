import type { OpenLinkDb } from '@openlink/db'
import { APIError } from 'better-auth/api'
import { Effect } from 'effect'

import { Db } from '../effect/services/db'
import { AccountPolicy } from './account-policy'

/**
 * Better Auth calls these with Promises; the rules themselves are Effects.
 * Rejections become `APIError`s so the browser gets a 400 with a readable message.
 */
export class AuthHooks {
  constructor(private readonly db: () => OpenLinkDb) {}

  private static badRequest(message: string) {
    return new APIError('BAD_REQUEST', { message })
  }

  async beforeCreateUser<T extends Record<string, unknown>>(user: T) {
    const data = await Effect.runPromise(
      AccountPolicy.sanitizeNewUser(user).pipe(
        Effect.catchTag('ProfileFieldRejected', (e) => Effect.die(AuthHooks.badRequest(e.message))),
      ),
    )
    return { data }
  }

  async beforeUpdateUser<T extends Record<string, unknown>>(update: T) {
    const data = await Effect.runPromise(
      AccountPolicy.validateUpdate(update).pipe(
        Effect.catchTag('ProfileFieldRejected', (e) => Effect.die(AuthHooks.badRequest(e.message))),
      ),
    )
    return { data }
  }

  async beforeDeleteUser(user: { id: string }) {
    await Effect.runPromise(
      AccountPolicy.ensureDeletable(user.id).pipe(
        Effect.provideService(Db, this.db()),
        Effect.catchTags({
          AccountStillOwnsWorkspaces: (e) => Effect.die(AuthHooks.badRequest(e.message)),
          // A failed lookup must not let an owner through.
          BackendError: () => Effect.die(new APIError('INTERNAL_SERVER_ERROR', { message: 'Could not delete the account. Try again.' })),
        }),
      ),
    )
  }
}
