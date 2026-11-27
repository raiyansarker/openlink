import { Context, Data, type Effect } from 'effect'

/** A fully rendered email, ready for any provider to send. */
export type OutgoingEmail = {
  /** Sender, e.g. `OpenLink <no-reply@example.com>`. */
  from: string
  to: string
  subject: string
  html: string
  text: string
}

/** A delivery that failed. `retryable` decides between another attempt and giving up. */
export class EmailDeliveryError extends Data.TaggedError('EmailDeliveryError')<{
  message: string
  retryable: boolean
}> {}

/** A provider that cannot be built because its credentials are missing. Selection moves on to the next one. */
export class EmailProviderUnavailable extends Data.TaggedError('EmailProviderUnavailable')<{
  provider: string
}> {}

/**
 * What the rest of the email code knows about a provider.
 * `send` succeeds once the provider has accepted the email, and fails with an
 * `EmailDeliveryError` otherwise (`retryable` for rate limits, outages and network failures).
 */
export type EmailProviderShape = {
  readonly name: string
  /** `idempotencyKey` is stable across retries of one message; use it if the provider supports it. */
  send(email: OutgoingEmail, options: { idempotencyKey: string }): Effect.Effect<void, EmailDeliveryError>
}

/** The provider that delivers outgoing email. Built once from the Worker's bindings (see `providers/index.ts`). */
export class EmailProvider extends Context.Service<EmailProvider, EmailProviderShape>()('openlink/EmailProvider') {}
