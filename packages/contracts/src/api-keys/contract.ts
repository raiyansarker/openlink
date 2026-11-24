import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import {
  ApiKey,
  ApiKeyIdPath,
  CreateApiKeyRequest,
  CreatedApiKey,
  CurrentApiKey,
  ListApiKeysResponse,
  OrganizationIdPath,
  UpdateApiKeyRequest,
} from './schema'

const keyOp = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  operationId: string,
  path: `/${string}`,
  extra: { successStatus?: 201 | 204; summary?: string } = {},
) =>
  oc.meta(openapi({ method, operationId, path, inputStructure: 'detailed', tags: ['API keys'], ...extra }))

export const listApiKeys = keyOp('GET', 'listApiKeys', '/organizations/{organizationId}/api-keys', {
  summary: 'List keys (owner or admin, signed-in session only)',
})
  .input(type({ params: OrganizationIdPath }))
  .output(ListApiKeysResponse)

export const createApiKey = keyOp('POST', 'createApiKey', '/organizations/{organizationId}/api-keys', {
  successStatus: 201,
  summary: 'Create a key; the secret is shown once',
})
  .input(type({ params: OrganizationIdPath, body: CreateApiKeyRequest }))
  .output(CreatedApiKey)

export const updateApiKey = keyOp('PATCH', 'updateApiKey', '/organizations/{organizationId}/api-keys/{keyId}', {
  summary: 'Change the role of a key',
})
  .input(type({ params: ApiKeyIdPath, body: UpdateApiKeyRequest }))
  .output(ApiKey)

export const revokeApiKey = keyOp('DELETE', 'revokeApiKey', '/organizations/{organizationId}/api-keys/{keyId}', {
  successStatus: 204,
  summary: 'Revoke a key immediately',
})
  .input(type({ params: ApiKeyIdPath }))
  .output(EmptyResponse)

export const rotateApiKey = keyOp(
  'POST',
  'rotateApiKey',
  '/organizations/{organizationId}/api-keys/{keyId}/rotate',
  { successStatus: 201, summary: 'Replace a key with a new one of the same name and role; the new secret is shown once' },
)
  .input(type({ params: ApiKeyIdPath }))
  .output(CreatedApiKey)

export const getCurrentApiKey = keyOp('GET', 'getCurrentApiKey', '/api-keys/current', {
  summary: 'The calling API key and its workspace (API key only)',
}).output(CurrentApiKey)

export const contract = {
  listApiKeys,
  createApiKey,
  updateApiKey,
  rotateApiKey,
  revokeApiKey,
  getCurrentApiKey,
} as const
