import type { organizationMember } from '@openlink/db/schema'

export type OrganizationRole = typeof organizationMember.$inferSelect.role

export function isAdmin(role: OrganizationRole) {
  return role === 'owner' || role === 'admin'
}

export function canManageLinks(role: OrganizationRole) {
  return isAdmin(role) || role === 'member'
}

export type AssignableRole = Exclude<OrganizationRole, 'owner'>

/** Roles a member of `actor` rank may hand out. Only owners may mint admins. */
export function assignableRoles(actor: OrganizationRole): AssignableRole[] {
  if (actor === 'owner') return ['admin', 'member', 'viewer']
  if (actor === 'admin') return ['member', 'viewer']
  return []
}

/**
 * Whether `actor` may change or remove `target`. Owners are untouchable here
 * (ownership moves only through a transfer), and admins cannot manage peers.
 */
export function canManageMember(actor: OrganizationRole, target: OrganizationRole) {
  if (target === 'owner') return false
  if (actor === 'owner') return true
  return actor === 'admin' && (target === 'member' || target === 'viewer')
}
