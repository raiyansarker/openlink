import { createDb, type OpenLinkDb } from '@openlink/db'
import { renderEmail } from '@openlink/email'
import { Effect, Layer } from 'effect'

import { Bindings } from '../effect/services/bindings'
import type { WorkerBindings } from '../env'
import { ServerLog } from '../observability/server-log'
import { composeEmail } from './compose'
import { type EmailEvent, isEmailEvent } from './events'
import { EmailProvider, type EmailDeliveryError } from './provider'
import { EmailProviderLive } from './providers'

/**
 * Why a delivery failed, safe to show in the Workflows dashboard: the provider, status and
 * error name only (`SES 400 MessageRejected`), never the provider's text, which can quote
 * the recipient.
 */
export type DeliveryFailure = { retryable: boolean; reason: string }

/**
 * Build one email from the database, render it and send it. Runs inside a single workflow
 * step that returns nothing, so Workflows never stores the email or its links. A retry
 * builds and renders again, which costs less than another step and picks up any change
 * (an account deleted or an invite revoked between attempts gets no email).
 */
export async function deliverEmail(
  env: WorkerBindings,
  event: EmailEvent,
  instanceId: string,
  /** The provider and database; tests pass their own. */
  deps: { providerLayer?: Layer.Layer<EmailProvider, EmailDeliveryError>; db?: OpenLinkDb } = {},
): Promise<DeliveryFailure | null> {
  const db = deps.db ?? createDb(env.DB)
  const providerLayer = deps.providerLayer ?? EmailProviderLive.pipe(Layer.provide(Layer.succeed(Bindings, env)))

  if (!isEmailEvent(event)) {
    ServerLog.warn('email.skipped', { reason: 'unknown_event', instanceId })
    return null
  }
  const composed = await composeEmail(db, env, event)
  if (typeof composed === 'string') {
    ServerLog.info('email.skipped', { type: event.type, reason: composed, instanceId })
    return null
  }

  const program = Effect.gen(function* () {
    const rendered = yield* Effect.promise(() => renderEmail(composed.message))
    const provider = yield* EmailProvider
    // The instance id is stable across retries of this email, so providers that support it de-duplicate.
    yield* provider.send(
      { from: env.EMAIL_FROM ?? '', to: composed.to, subject: rendered.subject, html: rendered.html, text: rendered.text },
      { idempotencyKey: instanceId },
    )
    ServerLog.info('email.sent', { type: event.type, instanceId, provider: provider.name })
    return null
  }).pipe(
    Effect.catchTag('EmailDeliveryError', (error) =>
      Effect.sync((): DeliveryFailure => {
        ServerLog.error(error.retryable ? 'email.send_retry' : 'email.send_dropped', error, { type: event.type, instanceId })
        return { retryable: error.retryable, reason: error.message.split(': ')[0] || 'Email delivery failed' }
      }),
    ),
    Effect.provide(providerLayer),
  )
  return Effect.runPromise(program)
}
