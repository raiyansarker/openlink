import { Resend } from 'resend'

import { EmailDeliveryError, type EmailProvider, type EmailProviderFactory } from '../provider'

/** Retry rate limits, provider outages and network failures; anything else will fail again. */
const isRetryable = (statusCode: number | null) => statusCode === null || statusCode === 429 || statusCode >= 500

export const resendProvider: EmailProviderFactory = {
  name: 'resend',
  create(bindings) {
    const apiKey = bindings.RESEND_API_KEY
    if (!apiKey) return null
    const client = new Resend(apiKey)
    return {
      name: 'resend',
      async send(email, { idempotencyKey }) {
        if (!email.from) throw new EmailDeliveryError('EMAIL_FROM is not set', false)
        let result: Awaited<ReturnType<typeof client.emails.send>>
        try {
          result = await client.emails.send(email, { idempotencyKey })
        } catch (error) {
          throw new EmailDeliveryError(error instanceof Error ? error.message : 'Email request failed', true)
        }
        if (result.error) {
          throw new EmailDeliveryError(`${result.error.name}: ${result.error.message}`, isRetryable(result.error.statusCode))
        }
      },
    } satisfies EmailProvider
  },
}
