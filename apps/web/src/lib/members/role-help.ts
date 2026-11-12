import type { WorkspaceMemberRole } from '#/data/demo/types'

export const WORKSPACE_MEMBER_ROLE_HELP: Record<WorkspaceMemberRole, string> = {
  owner: 'Full workspace control.',
  admin: 'Manage members, links, and settings.',
  member: 'Create and edit links.',
  viewer: 'Read-only access to links and analytics.',
}

export const ASSIGNABLE_WORKSPACE_ROLES: WorkspaceMemberRole[] = [
  'admin',
  'member',
  'viewer',
]
