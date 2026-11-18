import type { WorkerBindings } from '../env'

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
export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'EmailDeliveryError'
  }
}

/**
 * The only thing the rest of the email code knows about a provider.
 * `send` resolves once the provider has accepted the email, and throws an
 * `EmailDeliveryError` otherwise (`retryable` for rate limits, outages and network failures).
 */
export interface EmailProvider {
  readonly name: string
  /** `idempotencyKey` is stable across retries of one message; use it if the provider supports it. */
  send(email: OutgoingEmail, options: { idempotencyKey: string }): Promise<void>
}

/**
 * A way to build a provider from the Worker's bindings. `create` returns `null`
 * when the provider is not configured (its credentials are missing).
 */
export type EmailProviderFactory = {
  name: string
  create(bindings: WorkerBindings): EmailProvider | null
}
