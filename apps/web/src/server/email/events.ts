import type { EmailTemplateName } from '@openlink/email'

/**
 * What a workflow run is started with: which email, and the IDs to build it from. Run
 * params are shown in the Workflows dashboard, so no address, name or link goes in here. The run loads the rest from D1 when it sends (see `compose.ts`),
 * which also means a deleted account, a verified address or a revoked invite gets no email.
 */
export type EmailEvent =
  | { type: 'email-verification'; userId: string }
  | { type: 'password-reset'; userId: string }
  | { type: 'welcome'; userId: string }
  /**
   * When and from where the change happened, as the alert reports it. `device` and `location`
   * are coarse ("Chrome on macOS", "Dhaka, Bangladesh") and are the only descriptive fields
   * in any event: they describe the request, which cannot be looked up later.
   */
  | { type: 'password-changed'; userId: string; occurredAt: number; device: string; location: string }
  /** `inviterUserId` is null when an API key sent the invite. */
  | { type: 'workspace-invite'; inviteId: string; inviterUserId: string | null }
  /** To the person who sent an invite, once `memberUserId` accepted it. */
  | { type: 'invite-accepted'; inviteId: string; memberUserId: string }

/** The email template an event becomes; rate limits are counted per template. */
export function templateFor(event: EmailEvent): EmailTemplateName {
  if (event.type === 'password-changed') return 'security-alert'
  if (event.type === 'invite-accepted') return 'member-joined'
  return event.type
}

const EVENT_TYPES = new Set<string>(['email-verification', 'password-reset', 'welcome', 'password-changed', 'workspace-invite', 'invite-accepted'])

/** Run params are untyped JSON; a run started by an older deploy may carry another shape. */
export function isEmailEvent(value: unknown): value is EmailEvent {
  if (typeof value !== 'object' || value === null) return false
  const event = value as Record<string, unknown>
  if (typeof event.type !== 'string' || !EVENT_TYPES.has(event.type)) return false
  if (event.type === 'workspace-invite') return typeof event.inviteId === 'string'
  if (event.type === 'invite-accepted') return typeof event.inviteId === 'string' && typeof event.memberUserId === 'string'
  return typeof event.userId === 'string'
}
