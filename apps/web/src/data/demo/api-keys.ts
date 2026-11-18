import type { WorkspaceMemberRole } from '#/data/demo/types'

export type WorkspaceApiKey = {
  id: string
  name: string
  /** Display prefix only — full secret is never stored in the UI after creation. */
  prefix: string
  role: WorkspaceMemberRole
  createdAt: string
  lastUsedAt: string | null
}

/** Roles that may be assigned to a new API key (excludes owner). */
export const API_KEY_ASSIGNABLE_ROLES: WorkspaceMemberRole[] = [
  'admin',
  'member',
  'viewer',
]
