import type { EmailMessage } from '@openlink/email'

/** One email to send. Sealed (encrypted) before it becomes a workflow run's params; see `sealed-job.ts`. */
export type EmailJob = {
  to: string
  message: EmailMessage
}

type Branding = 'baseUrl' | 'logoUrl'

/**
 * An email as callers describe it. The app URL and logo are the same for every
 * email, so `EmailDispatch` fills them in.
 */
export type EmailDraft = EmailMessage extends infer M
  ? M extends EmailMessage
    ? { template: M['template']; props: Omit<M['props'], Branding> }
    : never
  : never
