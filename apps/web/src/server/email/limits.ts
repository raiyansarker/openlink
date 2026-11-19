import type { EmailTemplateName } from '@openlink/email'

import type { RateLimit, RateRule } from '../rate-limit/limiter'

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const rules = (...pairs: [window: number, max: number][]): RateRule[] => pairs.map(([window, max]) => ({ window, max }))

/**
 * Per recipient, per template. Every email costs money and lands in someone's inbox,
 * so nothing goes out more than once a minute to the same address.
 */
const PER_RECIPIENT: Record<EmailTemplateName, RateRule[]> = {
  // Includes the link sent at sign-up: two more a day, a minute apart.
  'email-verification': rules([MINUTE, 1], [DAY, 3]),
  'password-reset': rules([MINUTE, 1], [DAY, 3]),
  'security-alert': rules([MINUTE, 1], [DAY, 5]),
  'workspace-invite': rules([MINUTE, 1], [HOUR, 3], [DAY, 6]),
  welcome: rules([DAY, 1]),
  // An inviter adding a team hears about each join, but not more than a few an hour.
  'member-joined': rules([HOUR, 5], [DAY, 20]),
}

/** Any template, per recipient: one address cannot be flooded by mixing email types. */
const PER_RECIPIENT_TOTAL = rules([HOUR, 5], [DAY, 12])

/** Emails triggered from one client IP, across all recipients: sign-up, verification and reset requests. */
const PER_IP = rules([MINUTE, 3], [HOUR, 10], [DAY, 20])

/** Invitations sent from one workspace. */
const PER_ORGANIZATION = rules([HOUR, 30], [DAY, 100])

/**
 * Ceiling for the whole app: a cost backstop if every other limit is bypassed
 * (for example many IPs and many addresses at once). Raise it as real volume grows.
 */
const GLOBAL = rules([HOUR, 500], [DAY, 3000])

/** Where an email request came from, when known. */
export type EmailOrigin = { ip?: string | null; organizationId?: string | null }

/**
 * Every limit one email counts against, in the order they are checked. A stage is only
 * counted once the stages before it pass, so attempts refused for one reason do not
 * use up another allowance:
 *   1. caller: the client IP and workspace, so one abuser is cut off first;
 *   2. recipient: so a refused abuser cannot use up a real person's allowance;
 *   3. global: so nobody can use up the app-wide allowance by hammering one address.
 */
export function emailLimits(to: string, template: EmailTemplateName, origin: EmailOrigin = {}): RateLimit[][] {
  const recipient = to.trim().toLowerCase()
  const caller: RateLimit[] = []
  if (origin.ip) caller.push({ key: `email:ip:${origin.ip}`, rules: PER_IP })
  if (origin.organizationId) caller.push({ key: `email:org:${origin.organizationId}`, rules: PER_ORGANIZATION })
  return [
    caller,
    [
      { key: `email:${template}:to:${recipient}`, rules: PER_RECIPIENT[template] },
      { key: `email:any:to:${recipient}`, rules: PER_RECIPIENT_TOTAL },
    ],
    [{ key: 'email:global', rules: GLOBAL }],
  ]
}
