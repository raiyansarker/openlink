import { apiKey } from '@better-auth/api-key'
import type { BetterAuthPlugin } from 'better-auth'
import { createAccessControl } from 'better-auth/plugins/access'

export const API_KEY_PREFIX = 'sk_'

/** Roles a key can be issued with. Keys can never be owners. */
export const API_KEY_ROLES = ['admin', 'member', 'viewer'] as const
export type ApiKeyRole = (typeof API_KEY_ROLES)[number]

/**
 * The workspace role a key acts with is stored in the key's `permissions`, which the
 * plugin only lets the server set, so a key's role can't be chosen through the
 * client-facing `/api/auth/api-key/*` endpoints.
 */
export const ApiKeyPermissions = {
  forRole: (role: ApiKeyRole) => ({ workspace: [role] }),
  roleOf(permissions: Record<string, string[]> | null | undefined): ApiKeyRole | null {
    const role = permissions?.workspace?.[0]
    return (API_KEY_ROLES as readonly string[]).includes(role ?? '') ? (role as ApiKeyRole) : null
  },
}

// Who may manage a workspace's keys, in the organization access-control shape the
// API key plugin checks for organization-owned keys. Owners get everything.
const ac = createAccessControl({ apiKey: ['create', 'read', 'update', 'delete'] } as const)
const manageKeys = ac.newRole({ apiKey: ['create', 'read', 'update', 'delete'] })
const noKeys = ac.newRole({ apiKey: [] })
const workspaceKeyAccess = {
  ac,
  creatorRole: 'owner',
  roles: { owner: manageKeys, admin: manageKeys, member: noKeys, viewer: noKeys },
}

/**
 * OpenLink has its own workspaces rather than Better Auth's organization plugin. The API
 * key plugin authorizes organization-owned keys by reading the `member` model and the
 * organization plugin's role options, so this exposes `organization_member` as `member`
 * and supplies those options. See "API keys" in the root README.
 */
const workspaceMembers = () =>
  ({
    id: 'openlink-workspace-members',
    schema: {
      member: {
        fields: {
          organizationId: { type: 'string', required: true },
          userId: { type: 'string', required: true },
          role: { type: 'string', required: true },
          joinedAt: { type: 'date', required: true },
        },
      },
    },
    init: () => ({ context: { orgOptions: workspaceKeyAccess } as Record<string, unknown> }),
  }) satisfies BetterAuthPlugin

/**
 * The plugin's own HTTP endpoints. The dashboard and API use the `apiKeys` oRPC routes, which
 * add the workspace admin check and the activity log, so these are switched off. Server code
 * still reaches the same operations through `auth.api.*`, which `disabledPaths` doesn't affect.
 */
export const API_KEY_DISABLED_PATHS = [
  '/api-key/create',
  '/api-key/delete',
  '/api-key/get',
  '/api-key/list',
  '/api-key/update',
]

export const apiKeyPlugins = () => [
  workspaceMembers(),
  apiKey({
    references: 'organization',
    defaultPrefix: API_KEY_PREFIX,
    // The prefix plus six characters, enough to tell keys apart in the list.
    startingCharactersConfig: { shouldStore: true, charactersLength: API_KEY_PREFIX.length + 6 },
    maximumNameLength: 80,
    requireName: true,
    // Per-key request limits are not a product feature; the plugin default is 10 a day.
    rateLimit: { enabled: false },
  }),
] as const
