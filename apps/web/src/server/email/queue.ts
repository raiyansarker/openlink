import type { EmailMessage } from '@openlink/email'
import { Effect } from 'effect'

import { Bindings } from '../effect/services/bindings'
import type { WorkerBindings } from '../env'
import { ServerLog } from '../observability/server-log'
import type { EmailDraft, EmailJob } from './job'

/**
 * Producer side of the email queue. Sending is always asynchronous: callers only
 * enqueue, and the queue consumer renders and delivers (see `consumer.ts`).
 *
 * Enqueueing never fails the caller. A signup, invite or password reset has already
 * succeeded by the time we get here, so a queue problem is logged and swallowed.
 */
export class EmailQueue {
  /** Add the app URL and logo that every template shares. */
  static brand(bindings: Pick<WorkerBindings, 'BETTER_AUTH_URL'>, draft: EmailDraft): EmailMessage {
    const baseUrl = new URL(bindings.BETTER_AUTH_URL).origin
    return {
      template: draft.template,
      props: { ...draft.props, baseUrl, logoUrl: `${baseUrl}/logo192.png` },
    } as EmailMessage
  }

  static async send(bindings: WorkerBindings, to: string, draft: EmailDraft): Promise<void> {
    const queue = bindings.EMAIL_QUEUE
    if (!queue) {
      ServerLog.warn('email.queue_missing', { template: draft.template })
      return
    }
    if (!to.trim()) {
      ServerLog.warn('email.no_recipient', { template: draft.template })
      return
    }
    try {
      const job: EmailJob = { to: to.trim(), message: EmailQueue.brand(bindings, draft) }
      await queue.send(job)
    } catch (error) {
      ServerLog.error('email.enqueue_failed', error, { template: draft.template })
    }
  }

  /** The same, for Effect code. */
  static enqueue(to: string, draft: EmailDraft) {
    return Effect.gen(function* () {
      const bindings = yield* Bindings
      yield* Effect.promise(() => EmailQueue.send(bindings, to, draft))
    })
  }
}
