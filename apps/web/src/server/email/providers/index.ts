import { Effect, Layer } from 'effect'

import type { Bindings } from '../../effect/services/bindings'
import { EmailDeliveryError, EmailProvider, type EmailProviderShape, type EmailProviderUnavailable } from '../provider'
import { mailtrapLocalProvider } from './mailtrap-local'
import { resendProvider } from './resend'

/**
 * To add a provider (Postmark, SES, SendGrid, ...):
 *   1. Add a file here that exports an effect like `resendProvider`: it reads `Bindings`,
 *      fails with `EmailProviderUnavailable` when its credentials are missing, and otherwise
 *      returns an `EmailProviderShape` (copy `resend.ts`).
 *   2. Add its credential bindings to `WorkerBindings` in `src/server/env.ts`.
 *   3. List it below.
 * Nothing else changes. The first listed provider that is configured sends the mail.
 */
type Candidate = Effect.Effect<EmailProviderShape, EmailProviderUnavailable, Bindings>

const PRODUCTION: readonly Candidate[] = [resendProvider]

/** Under `vite dev` mail never leaves the machine: everything goes to Mailtrap Local. */
const DEVELOPMENT: readonly Candidate[] = [mailtrapLocalProvider]

/** Needs `Bindings`. Fails to build, without retry, when no provider is configured. */
export const EmailProviderLive = Layer.effect(
  EmailProvider,
  Effect.firstSuccessOf(import.meta.env.DEV ? DEVELOPMENT : PRODUCTION).pipe(
    Effect.catchTag('EmailProviderUnavailable', () =>
      Effect.fail(new EmailDeliveryError({ message: 'No email provider is configured (supported: resend)', retryable: false })),
    ),
  ),
)
