import { renderEmail } from '@openlink/email'

import type { WorkerBindings } from '../env'
import { ServerLog } from '../observability/server-log'
import type { EmailJob } from './job'
import { EmailDeliveryError } from './provider'
import { EmailProviders } from './providers'

/** 30s, 1m, 2m, ... capped at 30 minutes. `attempts` starts at 1. */
export function retryDelaySeconds(attempts: number) {
  return Math.min(30 * 2 ** Math.max(0, attempts - 1), 30 * 60)
}

/**
 * Queue consumer: renders and sends each email on its own, so one bad message
 * never holds back or repeats the rest of the batch.
 *
 * Transient failures are retried with backoff. After the queue's `max_retries`
 * the message moves to the dead-letter queue. Failures that cannot succeed
 * (a rejected address, missing configuration) are logged and dropped.
 */
export async function handleEmailBatch(batch: MessageBatch<EmailJob>, bindings: WorkerBindings): Promise<void> {
  for (const message of batch.messages) {
    const { template } = message.body.message
    try {
      const rendered = await renderEmail(message.body.message)
      const provider = EmailProviders.resolve(bindings)
      await provider.send(
        { from: bindings.EMAIL_FROM ?? '', to: message.body.to, subject: rendered.subject, html: rendered.html, text: rendered.text },
        { idempotencyKey: message.id },
      )
      ServerLog.info('email.sent', { template, messageId: message.id, provider: provider.name })
      message.ack()
    } catch (error) {
      const retryable = error instanceof EmailDeliveryError ? error.retryable : true
      ServerLog.error(retryable ? 'email.send_retry' : 'email.send_dropped', error, {
        template,
        messageId: message.id,
        attempts: message.attempts,
      })
      if (retryable) message.retry({ delaySeconds: retryDelaySeconds(message.attempts) })
      else message.ack()
    }
  }
}
