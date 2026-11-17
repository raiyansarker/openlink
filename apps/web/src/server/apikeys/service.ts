import { isAPIError } from 'better-auth/api'
import { Effect } from 'effect'

import { ApiKeyPermissions, type ApiKeyRole } from '#/server/auth/api-keys'
import { BackendError, operation } from '#/server/effect/operations'
import { useAuth } from '#/server/effect/services/auth'
import { WorkerRequest } from '#/server/effect/services/request'
import { ApiKeyNotFound } from './errors'

export type { ApiKeyRole }

/** A workspace key as the app sees it. The secret itself is never stored. */
export type ApiKeyRecord = {
  id: string
  organizationId: string
  name: string
  /** Leading characters of the secret, for recognition only. */
  prefix: string
  role: ApiKeyRole
  createdAt: Date
  lastUsedAt: Date | null
}

/** The identity a request authenticated with an API key acts as. */
export type ApiKeyPrincipal = {
  id: string
  organizationId: string
  role: ApiKeyRole
  name: string
}

/** The plugin's key shape, minus the hashed secret. */
type PluginApiKey = {
  id: string
  name: string | null
  start: string | null
  referenceId: string
  permissions?: Record<string, string[]> | null
  createdAt: Date | string
  lastRequest: Date | string | null
}

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value))

/** Keys without a valid role (e.g. made directly through `/api/auth/api-key/create`) are unusable. */
function toRecord(key: PluginApiKey): ApiKeyRecord | null {
  const role = ApiKeyPermissions.roleOf(key.permissions)
  if (!role) return null
  return {
    id: key.id,
    organizationId: key.referenceId,
    name: key.name ?? '',
    prefix: key.start ?? '',
    role,
    createdAt: toDate(key.createdAt),
    lastUsedAt: key.lastRequest ? toDate(key.lastRequest) : null,
  }
}

const isNotFound = (error: BackendError) => isAPIError(error.cause) && error.cause.status === 'NOT_FOUND'

const requestHeaders = Effect.gen(function* () {
  const request = yield* WorkerRequest
  return request.headers
})

/** Look up a key the signed-in caller may read, scoped to `organizationId`. */
function findKey(organizationId: string, keyId: string) {
  return Effect.gen(function* () {
    const auth = yield* useAuth
    const headers = yield* requestHeaders
    const key = yield* operation('apiKeys.get', () => auth.api.getApiKey({ query: { id: keyId }, headers })).pipe(
      Effect.catchIf(isNotFound, () => Effect.succeed(null)),
    )
    const record = key && key.referenceId === organizationId ? toRecord(key) : null
    if (!record) return yield* Effect.fail(new ApiKeyNotFound())
    return record
  })
}

/** Keys of one workspace, oldest first. Uses the caller's session. */
export function listApiKeys(organizationId: string) {
  return Effect.gen(function* () {
    const auth = yield* useAuth
    const headers = yield* requestHeaders
    const { apiKeys } = yield* operation('apiKeys.list', () =>
      auth.api.listApiKeys({ query: { organizationId, sortBy: 'createdAt', sortDirection: 'asc' }, headers }),
    )
    return apiKeys.flatMap((key) => toRecord(key) ?? [])
  })
}

/**
 * Returns the key plus the one-time plaintext secret. Runs as a server call on behalf of
 * `createdByUserId`, since only the server may set a key's permissions (its role).
 */
export function createApiKey(input: {
  organizationId: string
  name: string
  role: ApiKeyRole
  createdByUserId: string
}) {
  return Effect.gen(function* () {
    const auth = yield* useAuth
    const created = yield* operation('apiKeys.create', () =>
      auth.api.createApiKey({
        body: {
          organizationId: input.organizationId,
          userId: input.createdByUserId,
          name: input.name.trim(),
          permissions: ApiKeyPermissions.forRole(input.role),
        },
      }),
    )
    return { row: toRecord(created)!, secret: created.key }
  })
}

export function updateApiKeyRole(input: { organizationId: string; keyId: string; role: ApiKeyRole; userId: string }) {
  return Effect.gen(function* () {
    const auth = yield* useAuth
    const existing = yield* findKey(input.organizationId, input.keyId)
    if (existing.role === input.role) return { row: existing, previousRole: existing.role }
    yield* operation('apiKeys.updateRole', () =>
      auth.api.updateApiKey({
        body: { keyId: existing.id, userId: input.userId, permissions: ApiKeyPermissions.forRole(input.role) },
      }),
    )
    return { row: { ...existing, role: input.role }, previousRole: existing.role }
  })
}

/** Revoked keys stop working immediately: they no longer exist to authenticate against. */
export function revokeApiKey(organizationId: string, keyId: string) {
  return Effect.gen(function* () {
    const auth = yield* useAuth
    const headers = yield* requestHeaders
    const existing = yield* findKey(organizationId, keyId)
    yield* operation('apiKeys.revoke', () => auth.api.deleteApiKey({ body: { keyId: existing.id }, headers })).pipe(
      Effect.catchIf(isNotFound, () => Effect.fail(new ApiKeyNotFound())),
    )
    return existing
  })
}

/** Resolve a presented secret to its principal, or null when it is unknown, disabled or expired. */
export function authenticateApiKey(secret: string) {
  return Effect.gen(function* () {
    const auth = yield* useAuth
    const result = yield* operation('apiKeys.verify', () => auth.api.verifyApiKey({ body: { key: secret } }))
    const record = result.valid && result.key ? toRecord(result.key) : null
    if (!record) return null
    return { id: record.id, organizationId: record.organizationId, role: record.role, name: record.name } satisfies ApiKeyPrincipal
  })
}
