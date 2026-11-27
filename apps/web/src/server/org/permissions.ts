import type { organizationMember } from '@openlink/db/schema'

/**
 * The pure predicates live in `#/lib/perms/permissions` so the client UI gates
 * on the exact same rules the request guards enforce. This module keeps the
 * server-facing name for the role type (it must stay assignable to the db
 * column) and re-exports everything else.
 */
export type OrganizationRole = typeof organizationMember.$inferSelect.role
export type { AssignableRole, WorkspaceRole } from '#/lib/perms/permissions'

export { isAdmin, canManageLinks, canManageMember, assignableRoles } from '#/lib/perms/permissions'
