import { Effect } from 'effect'
import { Resend } from 'resend'

import { Bindings } from '../../effect/services/bindings'
import { EmailDeliveryError, EmailProviderUnavailable, type EmailProviderShape } from '../provider'

/** Retry rate limits, provider outages and network failures; anything else will fail again. */
const isRetryable = (statusCode: number | null) => statusCode === null || statusCode === 429 || statusCode >= 500

export const resendProvider = Effect.gen(function* () {
  const bindings = yield* Bindings
  const apiKey = bindings.RESEND_API_KEY
  if (!apiKey) return yield* new EmailProviderUnavailable({ provider: 'resend' })
  const client = new Resend(apiKey)
  return {
    name: 'resend',
    send: (email, { idempotencyKey }) =>
      Effect.gen(function* () {
        if (!email.from) return yield* new EmailDeliveryError({ message: 'EMAIL_FROM is not set', retryable: false })
        const result = yield* Effect.tryPromise({
          try: () => client.emails.send(email, { idempotencyKey }),
          catch: (error) =>
            new EmailDeliveryError({ message: error instanceof Error ? error.message : 'Email request failed', retryable: true }),
        })
        if (result.error) {
          return yield* new EmailDeliveryError({
            message: `${result.error.name}: ${result.error.message}`,
            retryable: isRetryable(result.error.statusCode),
          })
        }
      }),
  } satisfies EmailProviderShape
})
