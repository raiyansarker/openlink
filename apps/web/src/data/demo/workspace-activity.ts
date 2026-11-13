import { demoMembers } from './members'

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
  /** Documentation-range IPs (RFC 5737) for the demo. */
  ipAddress?: string
}

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  links: 'Links',
  domains: 'Domains',
  members: 'Members',
  security: 'Security',
  developers: 'API & webhooks',
}

const MINUTE = 60_000

/** Timestamps stay relative to now so the feed always reads as recent. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString()
}

type Template = Omit<WorkspaceActivityEvent, 'id' | 'orgId' | 'actor' | 'occurredAt'> & {
  /** Index into the org's members, or a non-member actor. */
  by: number | ActivityActor
  minutesAgo: number
}

const TEMPLATES: Template[] = [
  {
    by: 1,
    action: 'created link',
    target: 'launch',
    category: 'links',
    source: 'Dashboard',
    minutesAgo: 14,
    ipAddress: '203.0.113.24',
    details: [
      { label: 'Destination', value: 'https://example.com/launch' },
      { label: 'Folder', value: 'Campaigns' },
    ],
  },
  {
    by: { kind: 'api-key', name: 'CI deploy' },
    action: 'updated link',
    target: 'docs',
    category: 'links',
    source: 'API',
    minutesAgo: 52,
    ipAddress: '198.51.100.40',
    details: [
      { label: 'Changed', value: 'Destination URL' },
      { label: 'From', value: 'https://example.com/docs/v1' },
      { label: 'To', value: 'https://example.com/docs/v2' },
    ],
  },
  {
    by: 0,
    action: 'invited',
    target: 'member@example.com',
    category: 'members',
    source: 'Dashboard',
    minutesAgo: 95,
    ipAddress: '203.0.113.24',
    details: [{ label: 'Role', value: 'Editor' }],
  },
  {
    by: { kind: 'system', name: 'OpenLink' },
    action: 'verified domain',
    target: 'go.example.com',
    category: 'domains',
    source: 'Automation',
    minutesAgo: 180,
    details: [{ label: 'Records', value: 'CNAME, TXT' }],
  },
  {
    by: 2,
    action: 'paused link',
    target: 'spring-sale',
    category: 'links',
    source: 'Dashboard',
    minutesAgo: 60 * 5,
    ipAddress: '198.51.100.73',
  },
  {
    by: 0,
    action: 'rolled signing secret for',
    target: 'Production alerts',
    category: 'developers',
    source: 'Dashboard',
    minutesAgo: 60 * 7,
    ipAddress: '203.0.113.24',
  },
  {
    by: 1,
    action: 'signed in from a new device',
    target: 'Chrome on macOS',
    category: 'security',
    source: 'Dashboard',
    minutesAgo: 60 * 26,
    ipAddress: '192.0.2.140',
    details: [{ label: 'Location', value: 'London, United Kingdom' }],
  },
  {
    by: 3,
    action: 'archived link',
    target: 'black-friday',
    category: 'links',
    source: 'Dashboard',
    minutesAgo: 60 * 29,
    ipAddress: '198.51.100.12',
  },
  {
    by: 0,
    action: 'created API key',
    target: 'Analytics export',
    category: 'developers',
    source: 'Dashboard',
    minutesAgo: 60 * 31,
    ipAddress: '203.0.113.24',
    details: [{ label: 'Role', value: 'Viewer' }],
  },
  {
    by: 2,
    action: 'added domain',
    target: 'go.example.com',
    category: 'domains',
    source: 'Dashboard',
    minutesAgo: 60 * 50,
    ipAddress: '198.51.100.73',
  },
  {
    by: 0,
    action: 'changed the role of',
    target: 'a member',
    category: 'members',
    source: 'Dashboard',
    minutesAgo: 60 * 53,
    ipAddress: '203.0.113.24',
    details: [
      { label: 'From', value: 'Viewer' },
      { label: 'To', value: 'Editor' },
    ],
  },
  {
    by: { kind: 'system', name: 'OpenLink' },
    action: 'expired link',
    target: 'webinar-oct',
    category: 'links',
    source: 'Automation',
    minutesAgo: 60 * 24 * 4,
    details: [{ label: 'Reason', value: 'Reached its expiry date' }],
  },
  {
    by: 1,
    action: 'added webhook',
    target: 'Data warehouse',
    category: 'developers',
    source: 'Dashboard',
    minutesAgo: 60 * 24 * 5 + 40,
    ipAddress: '203.0.113.24',
    details: [{ label: 'Events', value: '4 events' }],
  },
  {
    by: 0,
    action: 'turned on two-factor authentication',
    target: 'for their account',
    category: 'security',
    source: 'Dashboard',
    minutesAgo: 60 * 24 * 6,
    ipAddress: '203.0.113.24',
  },
]

/** Demo audit feed for a workspace, newest first, using its real members. */
export function getWorkspaceActivity(orgId: string): WorkspaceActivityEvent[] {
  const members = demoMembers.filter(
    (member) => member.orgId === orgId && member.status === 'active',
  )
  if (members.length === 0) return []

  return TEMPLATES.map((template, index) => {
    const { by, minutesAgo: ago, ...rest } = template
    const member = typeof by === 'number' ? members[by % members.length] : null
    const actor: ActivityActor = member
      ? { kind: 'member', name: member.name, avatarUrl: member.avatarUrl }
      : (by as ActivityActor)
    return {
      ...rest,
      id: `act_${orgId}_${index}`,
      orgId,
      actor,
      occurredAt: minutesAgo(ago),
    }
  })
}
