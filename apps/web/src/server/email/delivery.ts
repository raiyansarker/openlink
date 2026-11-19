import { renderEmail } from '@openlink/email'
import { Effect, Layer } from 'effect'

import { Bindings } from '../effect/services/bindings'
import type { WorkerBindings } from '../env'
import { ServerLog } from '../observability/server-log'
import { EmailProvider, type EmailDeliveryError } from './provider'
import { EmailProviderLive } from './providers'
import { EmailJobSeal, type SealedEmailJob } from './sealed-job'

/**
 * Why a delivery failed, safe to show in the Workflows dashboard: the provider, status and
 * error name only (`SES 400 MessageRejected`), never the provider's text, which can quote
 * the recipient.
 */
export type DeliveryFailure = { retryable: boolean; reason: string }

/**
 * Decrypt, render and send one email. Runs inside a single workflow step that returns
 * nothing, so the rendered email (and its links) is never stored by Workflows. Rendering
 * again on a retry costs less than a second step.
 */
export async function deliverEmail(
  env: WorkerBindings,
  job: SealedEmailJob,
  instanceId: string,
  /** The provider; tests pass their own. */
  providerLayer: Layer.Layer<EmailProvider, EmailDeliveryError> = EmailProviderLive.pipe(Layer.provide(Layer.succeed(Bindings, env))),
): Promise<DeliveryFailure | null> {
  const opened = await EmailJobSeal.open(env.BETTER_AUTH_SECRET, job)
  if (!opened) {
    ServerLog.error('email.job_unreadable', new Error('Email job could not be decrypted'), { template: job.template, instanceId })
    return { retryable: false, reason: 'Email job could not be decrypted' }
  }

  const program = Effect.gen(function* () {
    const rendered = yield* Effect.promise(() => renderEmail(opened.message))
    const provider = yield* EmailProvider
    // The instance id is stable across retries of this email, so providers that support it de-duplicate.
    yield* provider.send(
      { from: env.EMAIL_FROM ?? '', to: opened.to, subject: rendered.subject, html: rendered.html, text: rendered.text },
      { idempotencyKey: instanceId },
    )
    ServerLog.info('email.sent', { template: job.template, instanceId, provider: provider.name })
    return null
  }).pipe(
    Effect.catchTag('EmailDeliveryError', (error) =>
      Effect.sync((): DeliveryFailure => {
        ServerLog.error(error.retryable ? 'email.send_retry' : 'email.send_dropped', error, { template: job.template, instanceId })
        return { retryable: error.retryable, reason: error.message.split(': ')[0] || 'Email delivery failed' }
      }),
    ),
    Effect.provide(providerLayer),
  )
  return Effect.runPromise(program)
}
