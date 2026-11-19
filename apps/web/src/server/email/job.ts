import type { EmailMessage } from '@openlink/email'

/** The body of one message on the email queue. Rendering and sending happen in the consumer. */
export type EmailJob = {
  to: string
  message: EmailMessage
}

type Branding = 'baseUrl' | 'logoUrl'

/**
 * An email as callers describe it. The app URL and logo are the same for every
 * email, so the queue producer fills them in.
 */
export type EmailDraft = EmailMessage extends infer M
  ? M extends EmailMessage
    ? { template: M['template']; props: Omit<M['props'], Branding> }
    : never
  : never
