import { SendEmailCommand, SESv2Client, SESv2ServiceException } from '@aws-sdk/client-sesv2'
import { FetchHttpHandler } from '@smithy/fetch-http-handler'
import { Effect } from 'effect'

import { Bindings } from '../../effect/services/bindings'
import { EmailDeliveryError, EmailProviderUnavailable, type EmailProviderShape, type OutgoingEmail } from '../provider'

/** SES errors that a later attempt can fix: throttling and sending-quota limits. Anything else will fail again. */
const RETRYABLE_ERRORS = new Set(['TooManyRequestsException', 'LimitExceededException', 'ThrottlingException'])

/** The part of `SESv2Client` the provider uses, so tests can stand in for AWS. */
export type SesSender = Pick<SESv2Client, 'send'>

export type SesConfig = { accessKeyId: string; secretAccessKey: string; region: string }

/**
 * One attempt per send: the email workflow owns retries and backoff. Requests go through
 * `fetch`, the Workers-native transport, rather than the SDK's default `node:https` handler.
 */
const createClient = ({ accessKeyId, secretAccessKey, region }: SesConfig): SesSender =>
  new SESv2Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    maxAttempts: 1,
    requestHandler: new FetchHttpHandler({ requestTimeout: 30_000 }),
  })

/** Whether another attempt can succeed. Errors that never reached SES (network, timeouts) might. */
function isRetryable(error: unknown) {
  if (!(error instanceof SESv2ServiceException)) return true
  const status = error.$metadata.httpStatusCode ?? 0
  return Boolean(error.$retryable) || RETRYABLE_ERRORS.has(error.name) || status === 429 || status >= 500
}

function toCommand(email: OutgoingEmail) {
  return new SendEmailCommand({
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
  })
}

/**
 * Amazon SES (API v2 `SendEmail`, via `@aws-sdk/client-sesv2`), the production provider.
 * Needs `AWS_SES_ACCESS_KEY_ID`, `AWS_SES_SECRET_ACCESS_KEY` (an IAM access key allowed
 * `ses:SendEmail`) and `AWS_SES_REGION`; the `EMAIL_FROM` address or its domain must be
 * verified in that region.
 */
export const makeSesProvider = (create: (config: SesConfig) => SesSender = createClient) =>
  Effect.gen(function* () {
    const bindings = yield* Bindings
    const accessKeyId = bindings.AWS_SES_ACCESS_KEY_ID?.trim()
    const secretAccessKey = bindings.AWS_SES_SECRET_ACCESS_KEY?.trim()
    const region = bindings.AWS_SES_REGION?.trim()
    if (!accessKeyId || !secretAccessKey || !region) return yield* new EmailProviderUnavailable({ provider: 'ses' })
    const client = create({ accessKeyId, secretAccessKey, region })

    return {
      name: 'ses',
      send: (email) =>
        Effect.gen(function* () {
          if (!email.from) return yield* new EmailDeliveryError({ message: 'EMAIL_FROM is not set', retryable: false })
          yield* Effect.tryPromise({
            try: () => client.send(toCommand(email)),
            catch: (error) => {
              const status = error instanceof SESv2ServiceException ? ` ${error.$metadata.httpStatusCode ?? ''}` : ''
              const name = error instanceof Error ? error.name : 'Error'
              const message = error instanceof Error ? error.message : 'Email request failed'
              return new EmailDeliveryError({ message: `SES${status} ${name}: ${message}`, retryable: isRetryable(error) })
            },
          })
        }),
    } satisfies EmailProviderShape
  })

export const sesProvider = makeSesProvider()
