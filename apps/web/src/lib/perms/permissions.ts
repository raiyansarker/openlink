/**
 * Pure workspace-role predicates shared by the server (request guards) and the
 * client (UI gating). One source of truth: the mirrors here must stay in sync
 * with the server guards in `#/server/effect/access.ts`, which use these helpers.
 *
 * These functions decide nothing on their own — the server re-checks every
 * request. The UI only uses them to hide controls a role would never pass.
 */

/** Workspace roles, highest rank first. */
export const WORKSPACE_ROLES = ['owner', 'admin', 'member', 'viewer'] as const

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

/** Roles a member can hold that others may hand out; ownership moves only by transfer. */
export type AssignableRole = Exclude<WorkspaceRole, 'owner'>

export function isOwner(role: WorkspaceRole) {
  return role === 'owner'
}

/** Owner + admin: the workspace-management rank (settings, members, domains, API keys). */
export function isAdmin(role: WorkspaceRole) {
  return role === 'owner' || role === 'admin'
}

/** Owner, admin or member: roles that may create and edit links and folders. */
export function canManageLinks(role: WorkspaceRole) {
  return isAdmin(role) || role === 'member'
}

/** Adding, verifying or removing a domain (server guard `requireOrgAdminEffect`). */
export function canManageDomains(role: WorkspaceRole) {
  return isAdmin(role)
}

/** Managing the org's settings: name, slug, logo (server guard `requireOrgAdminEffect`). */
export function canManageWorkspace(role: WorkspaceRole) {
  return isAdmin(role)
}

/** Inviting people and viewing pending invites (server guard `requireOrgAdminEffect`). */
export function canInviteMembers(role: WorkspaceRole) {
  return isAdmin(role)
}

/**
 * Managing API keys: any human admin or owner. (Server guard
 * `requireOrgAdminUserEffect`, which additionally excludes API-key principals —
 * a cookie session in the UI is always a human, so rank decides alone.)
 */
export function canManageApiKeys(role: WorkspaceRole) {
  return isAdmin(role)
}

/** Roles a member of `actor` rank may hand out. Only owners may mint admins. */
export function assignableRoles(actor: WorkspaceRole): AssignableRole[] {
  if (actor === 'owner') return ['admin', 'member', 'viewer']
  if (actor === 'admin') return ['member', 'viewer']
  return []
}

/**
 * Whether `actor` may change or remove `target`. Owners are untouchable here
 * (ownership moves only through a transfer), and admins cannot manage peers.
 */
export function canManageMember(actor: WorkspaceRole, target: WorkspaceRole) {
  if (target === 'owner') return false
  if (actor === 'owner') return true
  return actor === 'admin' && (target === 'member' || target === 'viewer')
}
