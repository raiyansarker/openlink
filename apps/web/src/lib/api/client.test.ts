import { describe, expect, test } from 'bun:test'

import { ApiClient } from './client'

type Seen = { method: string; url: string; body: unknown }

function setup(response: { status?: number; body?: unknown } = { body: {} }) {
  const seen: Seen[] = []
  const client = ApiClient.create({
    origin: () => 'http://localhost:3000',
    fetch: async (url, init) => {
      const text = typeof init.body === 'string' ? init.body : ''
      seen.push({ method: init.method ?? 'GET', url, body: text ? JSON.parse(text) : undefined })
      return new Response(response.status === 204 ? null : JSON.stringify(response.body ?? {}), {
        status: response.status ?? 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  })
  return { client, seen }
}

describe('ApiClient request shapes (derived from the shared contract)', () => {
  test('lists organizations with GET', async () => {
    const { client, seen } = setup({ body: { items: [] } })
    expect(await client.organizations.listOrganizations()).toEqual({ items: [] })
    expect(seen[0]).toMatchObject({ method: 'GET', url: 'http://localhost:3000/api/v1/organizations' })
  })

  test('puts path params in the URL and the body in JSON', async () => {
    const { client, seen } = setup({
      status: 201,
      body: { id: 'f1', organizationId: 'o1', parentId: null, name: 'Docs', createdAt: '2026-01-01T00:00:00.000Z' },
    })
    await client.folders.createFolder({ params: { organizationId: 'o 1' }, body: { name: 'Docs', parentId: null } })
    expect(seen[0]).toMatchObject({
      method: 'POST',
      url: 'http://localhost:3000/api/v1/organizations/o%201/folders',
      body: { name: 'Docs', parentId: null },
    })
  })

  test('sends query parameters for workspace link search', async () => {
    const { client, seen } = setup({ body: { items: [], total: 0 } })
    await client.links.listOrganizationLinks({
      params: { organizationId: 'o1' },
      query: { q: 'launch', status: 'active', limit: '25' },
    })
    const url = new URL(seen[0]!.url)
    expect(url.pathname).toBe('/api/v1/organizations/o1/links')
    expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'launch', status: 'active', limit: '25' })
  })

  test('uses DELETE for removals and tolerates an empty 204', async () => {
    const { client, seen } = setup({ status: 204 })
    await client.organizations.removeMember({ params: { organizationId: 'o1', userId: 'u2' } })
    expect(seen[0]).toMatchObject({ method: 'DELETE', url: 'http://localhost:3000/api/v1/organizations/o1/members/u2' })
  })
})
