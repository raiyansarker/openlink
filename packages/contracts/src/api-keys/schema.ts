import { type } from 'arktype'

import { OrganizationIdPath, OrganizationInviteRole } from '../organizations/schema'

/** Keys can never be owners. */
export const ApiKeyRole = OrganizationInviteRole

export const ApiKey = type({
  id: 'string',
  organizationId: 'string',
  name: 'string',
  /** Leading characters of the secret, for recognition only. */
  prefix: 'string',
  role: ApiKeyRole,
  createdAt: 'string',
  lastUsedAt: 'string | null',
})

/** The full secret is returned exactly once, when the key is created. */
export const CreatedApiKey = ApiKey.and(type({ secret: 'string' }))

export const ListApiKeysResponse = type({ items: ApiKey.array() })

export const CreateApiKeyRequest = type({
  name: type('string >= 1').and(type('string <= 80')),
  role: ApiKeyRole,
})

export const UpdateApiKeyRequest = type({ role: ApiKeyRole })

export const ApiKeyIdPath = type({
  organizationId: 'string',
  keyId: 'string',
})

export { OrganizationIdPath }
