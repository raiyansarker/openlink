import { Effect, Layer } from 'effect'

import type { Bindings } from '../../effect/services/bindings'
import { EmailDeliveryError, EmailProvider, type EmailProviderShape, type EmailProviderUnavailable } from '../provider'
import { mailtrapLocalProvider } from './mailtrap-local'
import { sesProvider } from './ses'

/**
 * To add a provider (Postmark, SES, SendGrid, ...):
 *   1. Add a file here that exports an effect like `sesProvider`: it reads `Bindings`,
 *      fails with `EmailProviderUnavailable` when its credentials are missing, and otherwise
 *      returns an `EmailProviderShape` (copy `ses.ts`).
 *   2. Add its credential bindings to `WorkerBindings` in `src/server/env.ts`.
 *   3. List it below.
 * Nothing else changes. The first listed provider that is configured sends the mail.
 */
type Candidate = Effect.Effect<EmailProviderShape, EmailProviderUnavailable, Bindings>

/**
 * Production: Amazon SES. Under `vite dev` mail never leaves the machine: everything goes
 * to Mailtrap Local. Written inline so the production build drops the dev provider.
 */
const CANDIDATES: readonly Candidate[] = import.meta.env.DEV ? [mailtrapLocalProvider] : [sesProvider]

/** Needs `Bindings`. Fails to build, without retry, when no provider is configured. */
export const EmailProviderLive = Layer.effect(
  EmailProvider,
  Effect.firstSuccessOf(CANDIDATES).pipe(
    Effect.catchTag('EmailProviderUnavailable', () =>
      Effect.fail(new EmailDeliveryError({ message: 'No email provider is configured (supported: ses)', retryable: false })),
    ),
  ),
)
