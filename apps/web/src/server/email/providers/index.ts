import type { WorkerBindings } from '../../env'
import { EmailDeliveryError, type EmailProvider, type EmailProviderFactory } from '../provider'
import { consoleProvider } from './console'
import { resendProvider } from './resend'

/**
 * To add a provider (Postmark, SES, SendGrid, ...):
 *   1. Add a file here that exports an `EmailProviderFactory` (copy `resend.ts`).
 *   2. Add its credential bindings to `WorkerBindings` in `src/server/env.ts`.
 *   3. List it below.
 * Nothing else changes. The first listed provider that is configured sends the mail.
 */
const PROVIDERS: readonly EmailProviderFactory[] = [resendProvider]

export class EmailProviders {
  /** Under `vite dev`, the terminal. Otherwise the first configured provider. */
  static resolve(bindings: WorkerBindings, providers: readonly EmailProviderFactory[] = PROVIDERS): EmailProvider {
    if (import.meta.env.DEV) return consoleProvider
    for (const factory of providers) {
      const provider = factory.create(bindings)
      if (provider) return provider
    }
    const names = providers.map((p) => p.name).join(', ')
    throw new EmailDeliveryError(`No email provider is configured (supported: ${names})`, false)
  }
}
