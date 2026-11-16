import { describe, expect, test } from 'bun:test'

import { ApiKeysApi } from './api-keys'
import { ApiClient } from './client'

function api(fail?: string) {
  const calls: string[] = []
  const client = ApiClient.create({
    origin: () => 'http://localhost',
    fetch: async (url, init) => {
      const key = `${init.method ?? 'GET'} ${new URL(url).pathname.replace('/api/v1', '')}`
      calls.push(key)
      if (fail && key.startsWith(fail)) return Response.json({ defined: false, code: 'FORBIDDEN', message: 'API keys cannot manage API keys' }, { status: 403 })
      if (init.method === 'POST') {
        return Response.json({ id: 'k2', organizationId: 'o1', name: 'CI', prefix: 'ol_live_abcd', role: 'member', createdAt: '2026-01-01T00:00:00.000Z', lastUsedAt: null, secret: 'ol_live_abcd-secret' }, { status: 201 })
      }
      return new Response(null, { status: 204 })
    },
  })
  return { keys: new ApiKeysApi(client), calls }
}

describe('ApiKeysApi', () => {
  test('creating returns the server-made secret', async () => {
    const { keys } = api()
    expect(await keys.create('o1', { name: 'CI', role: 'member' })).toBe('ol_live_abcd-secret')
  })

  test('rotating creates the replacement before revoking the old key', async () => {
    const { keys, calls } = api()
    expect(await keys.rotate('o1', { id: 'k1', name: 'CI', role: 'member' })).toBe('ol_live_abcd-secret')
    expect(calls).toEqual(['POST /organizations/o1/api-keys', 'DELETE /organizations/o1/api-keys/k1'])
  })

  test('if the replacement cannot be created, the old key is left working', async () => {
    const { keys, calls } = api('POST')
    await expect(keys.rotate('o1', { id: 'k1', name: 'CI', role: 'member' })).rejects.toThrow('API keys cannot manage API keys')
    expect(calls).toEqual(['POST /organizations/o1/api-keys'])
  })
})
