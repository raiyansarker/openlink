import type { Role } from '#/lib/api/types'

export const WORKSPACE_MEMBER_ROLE_HELP: Record<Role, string> = {
  owner: 'Full workspace control.',
  admin: 'Manage members, links, and settings.',
  member: 'Create and edit links.',
  viewer: 'Read-only access to links and analytics.',
}

export const ASSIGNABLE_WORKSPACE_ROLES: Role[] = [
  'admin',
  'member',
  'viewer',
]

/** Mirrors docs/roles.md — keep the two in sync when permissions change. */
export type RoleDetails = {
  /** One line that names the rank's job. */
  summary: string
  /** What that means in practice, shown under the role when picking one. */
  details: string
}

export const WORKSPACE_ROLE_DETAILS: Record<Role, RoleDetails> = {
  owner: {
    summary: 'Full workspace control.',
    details:
      'Everything an admin can do, plus transferring ownership and deleting the workspace.',
  },
  admin: {
    summary: 'Manages the workspace.',
    details:
      'Invites people and manages members and viewers, adds domains, edits workspace settings and API keys — and can still create and edit links.',
  },
  member: {
    summary: 'Creates and edits links.',
    details:
      'Full control over links and folders: create, edit, move, import. Read-only on workspace settings, domains, and members.',
  },
  viewer: {
    summary: 'Read-only everywhere.',
    details:
      'Sees links, folders, domains, analytics, and activity — no write actions of any kind.',
  },
}
