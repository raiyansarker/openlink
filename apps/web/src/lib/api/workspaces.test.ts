import { describe, expect, test } from 'bun:test'

import { ApiClient } from './client'
import { ApiError } from './error'
import { OrganizationMapper, WorkspaceApi } from './workspaces'

function api(handler: (url: string, init: RequestInit) => Response) {
  const calls: { url: string; method?: string; body?: unknown }[] = []
  const client = ApiClient.create({
    origin: () => 'http://localhost',
    fetch: async (url, init) => {
      calls.push({ url, method: init.method, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined })
      return handler(url, init)
    },
  })
  return { workspaces: new WorkspaceApi(client), calls }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('OrganizationMapper', () => {
  test('keeps identity and role, and defaults the plan', () => {
    expect(
      OrganizationMapper.fromMembership({ organization: { id: 'o1', name: 'Acme', slug: 'acme' }, role: 'admin' }),
    ).toEqual({ id: 'o1', name: 'Acme', slug: 'acme', plan: 'free', role: 'admin' })
  })
})

describe('WorkspaceApi', () => {
  test('lists workspaces with the viewer role for each', async () => {
    const { workspaces } = api(() =>
      json(200, {
        items: [
          { organization: { id: 'o1', name: 'Acme', slug: 'acme', createdAt: '2026-01-01T00:00:00.000Z' }, role: 'owner', joinedAt: '2026-01-01T00:00:00.000Z' },
          { organization: { id: 'o2', name: 'Other', slug: 'other', createdAt: '2026-01-02T00:00:00.000Z' }, role: 'viewer', joinedAt: '2026-01-02T00:00:00.000Z' },
        ],
      }),
    )
    const orgs = await workspaces.listOrganizations()
    expect(orgs.map((o) => [o.slug, o.role])).toEqual([['acme', 'owner'], ['other', 'viewer']])
  })

  test('creates a workspace and returns it as owner', async () => {
    const { workspaces, calls } = api(() =>
      json(201, { id: 'o9', name: 'New', slug: 'new', createdAt: '2026-01-01T00:00:00.000Z' }),
    )
    const org = await workspaces.createOrganization({ name: 'New', slug: 'new' })
    expect(org).toMatchObject({ id: 'o9', slug: 'new', role: 'owner' })
    expect(calls[0]).toMatchObject({ method: 'POST', body: { name: 'New', slug: 'new' } })
  })

  test('explains a taken slug', async () => {
    const conflict = api(() => json(409, { defined: false, code: 'CONFLICT', message: 'Unable to create organization' }))
    const taken = await conflict.workspaces.createOrganization({ name: 'x', slug: 'x' }).catch((e) => e)
    expect(taken).toBeInstanceOf(ApiError)
    expect(taken.message).toContain('already taken')
  })
})
