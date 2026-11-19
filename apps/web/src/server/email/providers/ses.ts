import { AwsClient } from 'aws4fetch'
import { Effect } from 'effect'

import { Bindings } from '../../effect/services/bindings'
import { EmailDeliveryError, EmailProviderUnavailable, type EmailProviderShape } from '../provider'

/** SES errors that a later attempt can fix: throttling and sending-quota limits. Anything else will fail again. */
const RETRYABLE_ERRORS = new Set(['TooManyRequestsException', 'LimitExceededException', 'ThrottlingException'])

/** `x-amzn-ErrorType` looks like `MessageRejected:http://internal.amazon.com/...`. */
const errorType = (response: Response) => response.headers.get('x-amzn-errortype')?.split(':')[0] ?? ''

/**
 * Amazon SES (API v2 `SendEmail`), the production provider. Requests are signed with
 * SigV4 by `aws4fetch`, which runs on Workers without the AWS SDK.
 * Needs `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY` and `AWS_SES_REGION`;
 * the `EMAIL_FROM` address or its domain must be verified in that region.
 */
export const sesProvider = Effect.gen(function* () {
  const bindings = yield* Bindings
  const { AWS_SES_ACCESS_KEY_ID: accessKeyId, AWS_SES_SECRET_ACCESS_KEY: secretAccessKey, AWS_SES_REGION: region } = bindings
  if (!accessKeyId || !secretAccessKey || !region) return yield* new EmailProviderUnavailable({ provider: 'ses' })
  const client = new AwsClient({ accessKeyId, secretAccessKey, region, service: 'ses', retries: 0 })
  const endpoint = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`

  return {
    name: 'ses',
    send: (email) =>
      Effect.gen(function* () {
        if (!email.from) return yield* new EmailDeliveryError({ message: 'EMAIL_FROM is not set', retryable: false })
        const response = yield* Effect.tryPromise({
          try: () =>
            client.fetch(endpoint, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                FromEmailAddress: email.from,
                Destination: { ToAddresses: [email.to] },
                Content: {
                  Simple: {
                    Subject: { Data: email.subject, Charset: 'UTF-8' },
                    Body: {
                      Html: { Data: email.html, Charset: 'UTF-8' },
                      Text: { Data: email.text, Charset: 'UTF-8' },
                    },
                  },
                },
              }),
            }),
          catch: (error) =>
            new EmailDeliveryError({ message: error instanceof Error ? error.message : 'Email request failed', retryable: true }),
        })
        if (response.ok) return
        const type = errorType(response)
        const body = yield* Effect.promise(() => response.text().catch(() => ''))
        return yield* new EmailDeliveryError({
          message: `SES ${response.status} ${type}: ${body.slice(0, 300)}`,
          retryable: response.status >= 500 || response.status === 429 || RETRYABLE_ERRORS.has(type),
        })
      }),
  } satisfies EmailProviderShape
})
