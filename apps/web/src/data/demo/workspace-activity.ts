export type ActivityCategory =
  | 'links'
  | 'domains'
  | 'members'
  | 'security'
  | 'developers'

export type ActivitySource = 'Dashboard' | 'API' | 'Automation'

export type ActivityActor =
  | { kind: 'member'; name: string; avatarUrl?: string }
  | { kind: 'api-key'; name: string }
  | { kind: 'system'; name: string }

export type WorkspaceActivityEvent = {
  id: string
  orgId: string
  actor: ActivityActor
  /** Past-tense verb phrase, e.g. "created link". */
  action: string
  /** What was acted on, e.g. "opl.ink/launch". */
  target: string
  category: ActivityCategory
  source: ActivitySource
  occurredAt: string
  /** Extra context shown in the detail sheet. */
  details?: { label: string; value: string }[]
  /** Sign-in IP, when recorded. */
  ipAddress?: string
}

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  links: 'Links',
  domains: 'Domains',
  members: 'Members',
  security: 'Security',
  developers: 'API & webhooks',
}
