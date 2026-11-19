import type { EmailMessage } from '@openlink/email'

type Branding = 'baseUrl' | 'logoUrl'

/**
 * An email as `compose.ts` builds it. The app URL and logo are the same for every
 * email, so `brandEmail` fills them in.
 */
export type EmailDraft = EmailMessage extends infer M
  ? M extends EmailMessage
    ? { template: M['template']; props: Omit<M['props'], Branding> }
    : never
  : never
