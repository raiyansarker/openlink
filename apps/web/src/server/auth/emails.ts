import { Effect, Layer } from 'effect'

import type { OpenLinkDb } from '@openlink/db'

import { Bindings } from '../effect/services/bindings'
import { Db } from '../effect/services/db'
import type { WorkerBindings } from '../env'
import { EmailDispatch, EmailDispatchLive } from '../email/dispatch'
import type { EmailEvent } from '../email/events'
import { EmailFormat } from '../email/format'
import { clientIp } from '../rate-limit/limiter'

type Recipient = { id: string; email: string }

/**
 * The emails Better Auth triggers, emitted as events (user IDs only). The email workflow
 * builds each one from the database when it sends, so Better Auth's own link is not used:
 * the workflow mints a fresh verification link and reads the reset token from D1.
 */
export class AuthEmails {
  constructor(
    private readonly bindings: () => WorkerBindings,
    private readonly db: () => OpenLinkDb,
  ) {}

  /**
   * Better Auth's hooks are plain async code, so this runs the dispatch service outside the
   * request runtime. The request's client IP counts toward the per-IP email limits.
   */
  private emit(to: string, event: EmailEvent, request?: Request): Promise<void> {
    const services = Layer.mergeAll(Layer.succeed(Bindings, this.bindings()), Layer.succeed(Db, this.db()))
    return Effect.runPromise(
      Effect.gen(function* () {
        const dispatch = yield* EmailDispatch
        yield* dispatch.send(to, event, { ip: clientIp(request) })
      }).pipe(Effect.provide(EmailDispatchLive.pipe(Layer.provide(services)))),
    )
  }

  verifyEmail(user: Recipient, request?: Request) {
    return this.emit(user.email, { type: 'email-verification', userId: user.id }, request)
  }

  resetPassword(user: Recipient, request?: Request) {
    return this.emit(user.email, { type: 'password-reset', userId: user.id }, request)
  }

  welcome(user: Recipient) {
    return this.emit(user.email, { type: 'welcome', userId: user.id })
  }

  /** Sent after a password reset completes, so the owner notices if it was not them. */
  passwordChanged(user: Recipient, request: Request | undefined) {
    const cf = (request as unknown as { cf?: Record<string, unknown> } | undefined)?.cf
    return this.emit(
      user.email,
      {
        type: 'password-changed',
        userId: user.id,
        occurredAt: Date.now(),
        device: EmailFormat.device(request?.headers.get('user-agent')),
        location: EmailFormat.location(cf),
      },
      request,
    )
  }
}
