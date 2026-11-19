import type { EmailMessage } from '@openlink/email'
import { Context, Effect, Layer } from 'effect'

import { Bindings } from '../effect/services/bindings'
import { Db } from '../effect/services/db'
import type { WorkerBindings } from '../env'
import { ServerLog } from '../observability/server-log'
import { type RateDecision, RateLimiter } from '../rate-limit/limiter'
import type { EmailDraft, EmailJob } from './job'
import { type EmailOrigin, emailLimits } from './limits'

/** Add the app URL and logo that every template shares. */
export function brandEmail(bindings: Pick<WorkerBindings, 'BETTER_AUTH_URL'>, draft: EmailDraft): EmailMessage {
  const baseUrl = new URL(bindings.BETTER_AUTH_URL).origin
  return {
    template: draft.template,
    props: { ...draft.props, baseUrl, logoUrl: `${baseUrl}/logo192.png` },
  } as EmailMessage
}

/**
 * Starts the email workflow. Sending is always asynchronous: callers only start a
 * run, and the workflow renders and delivers (see `workflow.ts`).
 *
 * Every email is rate limited first (see `limits.ts`). An email over a limit is
 * dropped silently: callers answer the same either way, so a response never
 * reveals whether an account exists or how often it was emailed.
 *
 * `send` never fails the caller. A signup, invite or password reset has already
 * succeeded by the time we get here, so a limiter or workflow problem is logged and swallowed.
 */
export class EmailDispatch extends Context.Service<
  EmailDispatch,
  { send(to: string, draft: EmailDraft, origin?: EmailOrigin): Effect.Effect<void> }
>()('openlink/EmailDispatch') {}

/** Needs `Bindings` and `Db`. */
export const EmailDispatchLive = Layer.effect(
  EmailDispatch,
  Effect.gen(function* () {
    const bindings = yield* Bindings
    const db = yield* Db
    const limiter = new RateLimiter(() => db)

    /** True when the email may go out. A limiter failure blocks it: mail costs money, and the person can retry. */
    const withinLimits = (to: string, draft: EmailDraft, origin: EmailOrigin | undefined) =>
      Effect.tryPromise(async () => {
        let decision: RateDecision = { allowed: true, retryAfter: null, exceeded: [] }
        for (const stage of emailLimits(to, draft.template, origin)) {
          decision = await limiter.consume(stage)
          if (!decision.allowed) break
        }
        if (!decision.allowed) {
          // Only the kind of limit is logged, never the address or IP in the key.
          ServerLog.warn('email.rate_limited', {
            template: draft.template,
            limits: decision.exceeded.map((key) => key.split(':').slice(0, 2).join(':')),
            retryAfter: decision.retryAfter,
          })
        }
        return decision.allowed
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            ServerLog.error('email.rate_limit_failed', error, { template: draft.template })
            return false
          }),
        ),
      )

    return {
      send: (to, draft, origin) =>
        Effect.gen(function* () {
          const workflow = bindings.EMAIL_WORKFLOW
          if (!workflow) return ServerLog.warn('email.workflow_missing', { template: draft.template })
          if (!to.trim()) return ServerLog.warn('email.no_recipient', { template: draft.template })
          if (!(yield* withinLimits(to, draft, origin))) return
          const job: EmailJob = { to: to.trim(), message: brandEmail(bindings, draft) }
          yield* Effect.tryPromise(() => workflow.create({ params: job })).pipe(
            Effect.catch((error) => Effect.sync(() => ServerLog.error('email.dispatch_failed', error, { template: draft.template }))),
          )
        }),
    }
  }),
)
