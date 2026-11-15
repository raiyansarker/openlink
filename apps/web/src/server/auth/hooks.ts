import type { OpenLinkDb } from '@openlink/db'
import { APIError } from 'better-auth/api'
import { Effect } from 'effect'

import type { WorkerBindings } from '../env'
import { Bindings } from '../effect/services/bindings'
import { Db } from '../effect/services/db'
import { MediaKey } from '../media/media-key'
import { MediaStore } from '../media/media-store'
import { SessionOriginReader } from '../devices/session-origin'
import { AccountPolicy } from './account-policy'

/**
 * Better Auth calls these with Promises; the rules themselves are Effects.
 * Rejections become `APIError`s so the browser gets a 400 with a readable message.
 */
export class AuthHooks {
  constructor(
    private readonly db: () => OpenLinkDb,
    private readonly bindings: () => WorkerBindings,
  ) {}

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

  /** `path` is the auth endpoint that triggered the write, when there is one. */
  async beforeUpdateUser<T extends Record<string, unknown>>(update: T, path?: string) {
    const data = await Effect.runPromise(
      AccountPolicy.validateUpdate(update, { fromProfileEndpoint: path === '/update-user' }).pipe(
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

  /** Record where and how a session started, for the Devices screen. */
  async beforeCreateSession<T extends Record<string, unknown>>(
    session: T,
    context: { path?: string; params?: Record<string, unknown>; request?: Request } | null | undefined,
  ) {
    // Workers attach the visitor's approximate location to every incoming request as `cf`.
    const cf = (context?.request as unknown as { cf?: Record<string, unknown> } | undefined)?.cf
    const origin = SessionOriginReader.read({ cf, path: context?.path, providerId: context?.params?.id })
    return { data: { ...session, ...origin } }
  }

  /** The account is gone; remove its uploaded picture. Never fails the deletion. */
  async afterDeleteUser(user: { image?: string | null }) {
    await Effect.runPromise(
      MediaStore.removeQuietly(MediaKey.fromUrl(user.image)).pipe(Effect.provideService(Bindings, this.bindings())),
    )
  }
}
