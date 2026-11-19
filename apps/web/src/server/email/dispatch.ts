import type { EmailMessage } from '@openlink/email'
import { Context, Effect, Layer } from 'effect'

import { Bindings } from '../effect/services/bindings'
import type { WorkerBindings } from '../env'
import { ServerLog } from '../observability/server-log'
import type { EmailDraft, EmailJob } from './job'

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
 * `send` never fails the caller. A signup, invite or password reset has already
 * succeeded by the time we get here, so a workflow problem is logged and swallowed.
 */
export class EmailDispatch extends Context.Service<
  EmailDispatch,
  { send(to: string, draft: EmailDraft): Effect.Effect<void> }
>()('openlink/EmailDispatch') {}

/** Needs `Bindings`. */
export const EmailDispatchLive = Layer.effect(
  EmailDispatch,
  Effect.gen(function* () {
    const bindings = yield* Bindings
    return {
      send: (to, draft) =>
        Effect.gen(function* () {
          const workflow = bindings.EMAIL_WORKFLOW
          if (!workflow) return ServerLog.warn('email.workflow_missing', { template: draft.template })
          if (!to.trim()) return ServerLog.warn('email.no_recipient', { template: draft.template })
          const job: EmailJob = { to: to.trim(), message: brandEmail(bindings, draft) }
          yield* Effect.tryPromise(() => workflow.create({ params: job })).pipe(
            Effect.catch((error) => Effect.sync(() => ServerLog.error('email.dispatch_failed', error, { template: draft.template }))),
          )
        }),
    }
  }),
)
