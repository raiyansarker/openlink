import type { organizationMember } from '@openlink/db/schema'

export type OrganizationRole = typeof organizationMember.$inferSelect.role

export function isAdmin(role: OrganizationRole) {
  return role === 'owner' || role === 'admin'
}

export function canManageLinks(role: OrganizationRole) {
  return isAdmin(role) || role === 'member'
}
