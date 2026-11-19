import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { NonRetryableError } from 'cloudflare:workflows'
import { renderEmail } from '@openlink/email'
import { Effect, Layer } from 'effect'

import { Bindings } from '../effect/services/bindings'
import type { WorkerBindings } from '../env'
import { ServerLog } from '../observability/server-log'
import type { EmailJob } from './job'
import { EmailProvider, type EmailDeliveryError, type OutgoingEmail } from './provider'
import { EmailProviderLive } from './providers'

type Delivery = { ok: true; provider: string } | { ok: false; error: EmailDeliveryError }

/** Build the provider from the Worker's bindings and send once. Delivery failures come back as a value. */
function deliver(env: WorkerBindings, email: OutgoingEmail, idempotencyKey: string): Promise<Delivery> {
  const program = Effect.gen(function* () {
    const provider = yield* EmailProvider
    yield* provider.send(email, { idempotencyKey })
    return { ok: true, provider: provider.name } as Delivery
  }).pipe(
    Effect.catchTag('EmailDeliveryError', (error) => Effect.succeed<Delivery>({ ok: false, error })),
    Effect.provide(EmailProviderLive.pipe(Layer.provide(Layer.succeed(Bindings, env)))),
  )
  return Effect.runPromise(program)
}

/**
 * One run per email. Rendering and sending are separate steps, so a retried send
 * never renders again, and each run is isolated from every other email.
 *
 * Transient failures (rate limits, outages, network) retry with exponential backoff:
 * 30s, 1m, 2m, ... After the last retry the run is marked errored in the dashboard.
 * Failures that cannot succeed (a rejected address, missing configuration) are not retried.
 */
export class EmailWorkflow extends WorkflowEntrypoint<WorkerBindings, EmailJob> {
  async run(event: WorkflowEvent<EmailJob>, step: WorkflowStep): Promise<void> {
    const { to, message } = event.payload
    const { template } = message

    const rendered = await step.do('render', async () => {
      const { subject, html, text } = await renderEmail(message)
      return { subject, html, text }
    })

    await step.do('send', { retries: { limit: 6, delay: '30 seconds', backoff: 'exponential' }, timeout: '1 minute' }, async () => {
      // The instance id is stable across retries of this email, so the provider can de-duplicate.
      const result = await deliver(this.env, { from: this.env.EMAIL_FROM ?? '', to, ...rendered }, event.instanceId)
      if (!result.ok) {
        const { error } = result
        ServerLog.error(error.retryable ? 'email.send_retry' : 'email.send_dropped', error, { template, instanceId: event.instanceId })
        if (!error.retryable) throw new NonRetryableError(error.message)
        throw new Error(error.message)
      }
      ServerLog.info('email.sent', { template, instanceId: event.instanceId, provider: result.provider })
    })
  }
}
