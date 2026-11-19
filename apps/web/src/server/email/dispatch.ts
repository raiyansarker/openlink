import { Context, Effect, Layer } from 'effect'

import { Bindings } from '../effect/services/bindings'
import { Db } from '../effect/services/db'
import { ServerLog } from '../observability/server-log'
import { type RateDecision, RateLimiter } from '../rate-limit/limiter'
import { type EmailEvent, templateFor } from './events'
import { type EmailOrigin, emailLimits } from './limits'

/**
 * Emits email events: each one starts a workflow run (see `workflow.ts`) that builds the
 * email from the database and sends it. Callers never render or send.
 *
 * `to` is only for rate limiting (see `limits.ts`); it is not part of the event. An event
 * over a limit is dropped silently: callers answer the same either way, so a response never
 * reveals whether an account exists or how often it was emailed.
 *
 * `send` never fails the caller. A signup, invite or password reset has already
 * succeeded by the time we get here, so a limiter or workflow problem is logged and swallowed.
 */
export class EmailDispatch extends Context.Service<
  EmailDispatch,
  { send(to: string, event: EmailEvent, origin?: EmailOrigin): Effect.Effect<void> }
>()('openlink/EmailDispatch') {}

/** Needs `Bindings` and `Db`. */
export const EmailDispatchLive = Layer.effect(
  EmailDispatch,
  Effect.gen(function* () {
    const bindings = yield* Bindings
    const db = yield* Db
    const limiter = new RateLimiter(() => db)

    /** True when the email may go out. A limiter failure blocks it: mail costs money, and the person can retry. */
    const withinLimits = (to: string, event: EmailEvent, origin: EmailOrigin | undefined) =>
      Effect.tryPromise(async () => {
        let decision: RateDecision = { allowed: true, retryAfter: null, exceeded: [] }
        for (const stage of emailLimits(to, templateFor(event), origin)) {
          decision = await limiter.consume(stage)
          if (!decision.allowed) break
        }
        if (!decision.allowed) {
          // Only the kind of limit is logged, never the address or IP in the key.
          ServerLog.warn('email.rate_limited', {
            type: event.type,
            limits: decision.exceeded.map((key) => key.split(':').slice(0, 2).join(':')),
            retryAfter: decision.retryAfter,
          })
        }
        return decision.allowed
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            ServerLog.error('email.rate_limit_failed', error, { type: event.type })
            return false
          }),
        ),
      )

    return {
      send: (to, event, origin) =>
        Effect.gen(function* () {
          const workflow = bindings.EMAIL_WORKFLOW
          if (!workflow) return ServerLog.warn('email.workflow_missing', { type: event.type })
          if (!to.trim()) return ServerLog.warn('email.no_recipient', { type: event.type })
          if (!(yield* withinLimits(to, event, origin))) return
          yield* Effect.tryPromise(() => workflow.create({ params: event })).pipe(
            Effect.catch((error) => Effect.sync(() => ServerLog.error('email.dispatch_failed', error, { type: event.type }))),
          )
        }),
    }
  }),
)
