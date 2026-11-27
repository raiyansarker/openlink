import { type } from 'arktype'
import { describe, expect, test } from 'bun:test'
import { ApiKey, CreateApiKeyRequest, CreatedApiKey, UpdateApiKeyRequest } from './schema'

const key = { id: 'k1', organizationId: 'o1', name: 'CI', prefix: 'sk_8f3a', role: 'member', createdAt: '2026-01-01T00:00:00Z', lastUsedAt: null }

describe('api key schemas', () => {
  test('keys can never be owners', () => {
    expect(CreateApiKeyRequest({ name: 'CI', role: 'owner' })).toBeInstanceOf(type.errors)
    expect(UpdateApiKeyRequest({ role: 'owner' })).toBeInstanceOf(type.errors)
    expect(CreateApiKeyRequest({ name: 'CI', role: 'viewer' })).toEqual({ name: 'CI', role: 'viewer' })
  })

  test('names are required and bounded', () => {
    expect(CreateApiKeyRequest({ name: '', role: 'admin' })).toBeInstanceOf(type.errors)
    expect(CreateApiKeyRequest({ name: 'x'.repeat(81), role: 'admin' })).toBeInstanceOf(type.errors)
  })

  test('the secret appears only on the creation response', () => {
    expect(ApiKey(key)).toEqual(key)
    expect(CreatedApiKey({ ...key, secret: 'sk_x' })).not.toBeInstanceOf(type.errors)
    expect(CreatedApiKey(key)).toBeInstanceOf(type.errors)
  })
})
