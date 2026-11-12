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

export const DEMO_WORKSPACE_API_KEYS: WorkspaceApiKey[] = [
  {
    id: 'key_prod',
    name: 'Production',
    prefix: 'ol_live_8f3a',
    role: 'admin',
    createdAt: '2026-10-02T14:20:00.000Z',
    lastUsedAt: '2026-11-11T09:14:00.000Z',
  },
  {
    id: 'key_ci',
    name: 'CI deploy',
    prefix: 'ol_live_2c91',
    role: 'member',
    createdAt: '2026-09-18T11:05:00.000Z',
    lastUsedAt: '2026-11-10T22:40:00.000Z',
  },
  {
    id: 'key_analytics',
    name: 'Analytics export',
    prefix: 'ol_live_b704',
    role: 'viewer',
    createdAt: '2026-08-04T16:30:00.000Z',
    lastUsedAt: null,
  },
]

/** Roles that may be assigned to a new API key (excludes owner). */
export const API_KEY_ASSIGNABLE_ROLES: WorkspaceMemberRole[] = [
  'admin',
  'member',
  'viewer',
]
