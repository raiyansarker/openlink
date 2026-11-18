import type { Role } from '#/lib/api/types'

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export function workspaceMemberRoleLabel(role: Role): string {
  return ROLE_LABELS[role]
}
