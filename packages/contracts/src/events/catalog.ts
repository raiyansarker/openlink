export type WorkspaceEventGroup = 'links' | 'clicks' | 'domains' | 'members' | 'developers' | 'workspace'

type EventDefinition = {
  group: WorkspaceEventGroup
  /** Short display name. */
  label: string
  /** When it fires. */
  description: string
}

/**
 * Every event a workspace can produce. The activity feed records the ones
 * people cause. Add new events here first; names are part of the public API,
 * so never rename one.
 */
const DEFINITIONS = {
  'link.created': { group: 'links', label: 'Link created', description: 'A short link is created' },
  'link.updated': { group: 'links', label: 'Link updated', description: 'A destination or setting changes' },
  'link.moved': { group: 'links', label: 'Link moved', description: 'A link moves to another folder' },
  'link.tagged': { group: 'links', label: 'Link tagged', description: 'Tags are added to a link' },
  'link.held': { group: 'links', label: 'Link put on hold', description: 'A link starts showing its hold page' },
  'link.released': { group: 'links', label: 'Link released', description: 'A hold is lifted and the link redirects again' },
  'link.deleted': { group: 'links', label: 'Link deleted', description: 'A short link is removed' },
  'link.password_locked': {
    group: 'links',
    label: 'Password guesses blocked',
    description: 'Too many wrong passwords on a protected link',
  },
  'folder.created': { group: 'links', label: 'Folder created', description: 'A folder is created' },
  'folder.updated': { group: 'links', label: 'Folder updated', description: 'A folder is renamed or moved' },
  'folder.deleted': { group: 'links', label: 'Folder deleted', description: 'A folder is removed' },
  'click.recorded': { group: 'clicks', label: 'Click recorded', description: 'Every click on any link (high volume)' },
  'click.milestone': { group: 'clicks', label: 'Click milestone', description: 'A link reaches 100, 1k, 10k… clicks' },
  'domain.added': { group: 'domains', label: 'Domain added', description: 'A custom domain is connected' },
  'domain.verified': { group: 'domains', label: 'Domain verified', description: 'DNS checks pass for a domain' },
  'domain.misconfigured': { group: 'domains', label: 'Domain misconfigured', description: 'DNS stops matching for a domain' },
  'domain.removed': { group: 'domains', label: 'Domain removed', description: 'A custom domain is disconnected' },
  'member.invited': { group: 'members', label: 'Member invited', description: 'Someone is invited to the workspace' },
  'member.joined': { group: 'members', label: 'Member joined', description: 'An invite is accepted' },
  'member.role_changed': { group: 'members', label: 'Member role changed', description: 'A member gets a different role' },
  'member.removed': { group: 'members', label: 'Member removed', description: 'Someone leaves or is removed' },
  'invite.revoked': { group: 'members', label: 'Invite revoked', description: 'A pending invite is withdrawn' },
  'invite.declined': { group: 'members', label: 'Invite declined', description: 'Someone turns down an invite' },
  'invite.resent': { group: 'members', label: 'Invite resent', description: 'A pending invite is sent again, with a new expiry' },
  'apikey.created': { group: 'developers', label: 'API key created', description: 'A new API key is made' },
  'apikey.role_changed': { group: 'developers', label: 'API key role changed', description: 'An API key gets a different role' },
  'apikey.revoked': { group: 'developers', label: 'API key revoked', description: 'An API key stops working' },
  'workspace.updated': { group: 'workspace', label: 'Workspace updated', description: 'The name, URL or logo changes' },
  'workspace.ownership_transferred': {
    group: 'workspace',
    label: 'Ownership transferred',
    description: 'The workspace gets a new owner',
  },
} as const satisfies Record<string, EventDefinition>

export type WorkspaceEventType = keyof typeof DEFINITIONS

export class WorkspaceEvents {
  static readonly DEFINITIONS: Readonly<Record<WorkspaceEventType, EventDefinition>> = DEFINITIONS
  static readonly TYPES = Object.keys(DEFINITIONS) as WorkspaceEventType[]

  static readonly GROUP_LABELS: Readonly<Record<WorkspaceEventGroup, string>> = {
    links: 'Links',
    clicks: 'Clicks',
    domains: 'Domains',
    members: 'Members',
    developers: 'Developers',
    workspace: 'Workspace',
  }

  static isType(value: string): value is WorkspaceEventType {
    return value in DEFINITIONS
  }

  static definition(event: WorkspaceEventType): EventDefinition {
    return DEFINITIONS[event]
  }

  /** Click counts that fire `click.milestone`. */
  static readonly CLICK_MILESTONES = [100, 1_000, 10_000, 100_000, 1_000_000, 10_000_000] as const

  static isClickMilestone(count: number): boolean {
    return (WorkspaceEvents.CLICK_MILESTONES as readonly number[]).includes(count)
  }
}
