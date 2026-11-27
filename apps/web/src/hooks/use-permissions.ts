import { useMemo } from 'react'

import { useOrganization } from '#/contexts/OrganizationContext'
import {
  assignableRoles,
  canManageApiKeys,
  canManageDomains,
  canManageLinks,
  canManageMember,
  canManageWorkspace,
  isAdmin,
  isOwner,
  type AssignableRole,
  type WorkspaceRole,
} from '#/lib/perms/permissions'

/**
 * Role-based permissions of the signed-in user for the active workspace,
 * mirroring the server's request guards. UI gates on these to hide what the
 * current role could never do — the server re-checks every request regardless.
 *
 * Must be used inside `OrganizationProvider` (the `/w/$orgSlug` layout and the
 * workspace settings pages provide it).
 */
export function usePermissions() {
  const { activeOrg } = useOrganization()
  // Compiles only while the API's Role and WorkspaceRole stay the same union:
  // adding a DB role without updating the predicates fails the build here.
  const role: WorkspaceRole = activeOrg.role

  return useMemo(
    () => ({
      role,
      isViewer: role === 'viewer',
      isAdmin: isAdmin(role),
      isOwner: isOwner(role),
      /** Create, edit, delete links and folders. */
      canManageLinks: canManageLinks(role),
      /** Add, verify or remove custom domains. */
      canManageDomains: canManageDomains(role),
      /** Rename the workspace, change its slug or logo. */
      canManageWorkspace: canManageWorkspace(role),
      /** Invite people and manage members (subject to target rank via `canManageMember`). */
      canManageMembers: isAdmin(role),
      canManageApiKeys: canManageApiKeys(role),
      /** Whether this member may change or remove `target` (owners untouchable, admins don't manage peers). */
      canManageMember: (target: WorkspaceRole) => canManageMember(role, target),
      /** Roles this member may hand out when inviting. */
      assignableRoles: assignableRoles(role) as AssignableRole[],
    }),
    [role],
  )
}

export type Permissions = ReturnType<typeof usePermissions>
