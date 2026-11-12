import type { WorkspaceMemberRole } from '#/data/demo/types'

const ROLE_LABELS: Record<WorkspaceMemberRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export function workspaceMemberRoleLabel(role: WorkspaceMemberRole): string {
  return ROLE_LABELS[role]
}
