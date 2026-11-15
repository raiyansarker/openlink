import { describe, expect, test } from 'bun:test'

import { ApiClient } from './client'
import { MemberId, WorkspaceMembersApi } from './members'

function api(responses: Record<string, unknown>) {
  const calls: { method: string; path: string; body?: unknown }[] = []
  const client = ApiClient.create({
    origin: () => 'http://localhost',
    fetch: async (url, init) => {
      const path = new URL(url).pathname.replace('/api/v1', '')
      calls.push({ method: init.method ?? 'GET', path, body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined })
      const key = `${init.method ?? 'GET'} ${path}`
      if (key in responses) return Response.json(responses[key])
      return new Response(null, { status: 204 })
    },
  })
  return { members: new WorkspaceMembersApi(client), calls }
}

const member = { userId: 'u2', name: 'Bob', email: 'bob@e.test', role: 'member', joinedAt: '2026-01-01T00:00:00.000Z' }
const invite = { id: 'i1', organizationId: 'o1', email: 'new@e.test', role: 'viewer', expiresAt: '2026-02-01T00:00:00.000Z', createdAt: '2026-01-02T00:00:00.000Z' }

describe('MemberId', () => {
  test('round-trips people and invites, and rejects anything else', () => {
    expect(MemberId.parse(MemberId.ofUser('u:1'))).toEqual({ kind: 'user', id: 'u:1' })
    expect(MemberId.parse(MemberId.ofInvite('i1'))).toEqual({ kind: 'invite', id: 'i1' })
    expect(MemberId.parse('mbr_demo')).toBeNull()
    expect(MemberId.parse('user:')).toBeNull()
  })
})

describe('WorkspaceMembersApi', () => {
  test('merges people and pending invites for admins', async () => {
    const { members } = api({ 'GET /organizations/o1/members': { items: [member] }, 'GET /organizations/o1/invites': { items: [invite] } })
    const rows = await members.list('o1', { includeInvites: true })
    expect(rows.map((r) => [r.id, r.status, r.role])).toEqual([['user:u2', 'active', 'member'], ['invite:i1', 'pending', 'viewer']])
  })

  test('does not request invites for people who cannot see them', async () => {
    const { members, calls } = api({ 'GET /organizations/o1/members': { items: [member] } })
    await members.list('o1', { includeInvites: false })
    expect(calls.map((c) => c.path)).toEqual(['/organizations/o1/members'])
  })

  test('routes each action to the right endpoint', async () => {
    const { members, calls } = api({ 'POST /organizations/o1/invites': { ...invite, id: 'i9' }, 'PATCH /organizations/o1/members/u2': member, 'POST /organizations/o1/invites/i1/resend': invite, 'POST /organizations/o1/transfer-ownership': { id: 'o1', name: 'Acme', slug: 'acme', createdAt: '2026-01-01T00:00:00.000Z' } })
    await members.invite('o1', 'new@e.test', 'viewer')
    await members.changeRole('o1', 'user:u2', 'admin')
    await members.remove('o1', 'user:u2')
    await members.remove('o1', 'invite:i1')
    await members.resendInvite('o1', 'invite:i1')
    await members.transferOwnership('o1', 'user:u2')
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /organizations/o1/invites',
      'PATCH /organizations/o1/members/u2',
      'DELETE /organizations/o1/members/u2',
      'DELETE /organizations/o1/invites/i1',
      'POST /organizations/o1/invites/i1/resend',
      'POST /organizations/o1/transfer-ownership',
    ])
    expect(calls[0]!.body).toEqual({ email: 'new@e.test', role: 'viewer' })
    expect(calls[5]!.body).toEqual({ userId: 'u2' })
  })

  test('refuses actions that make no sense for an invite or a person', async () => {
    const { members, calls } = api({})
    await expect(members.changeRole('o1', 'invite:i1', 'admin')).rejects.toThrow('has not joined')
    await expect(members.resendInvite('o1', 'user:u2')).rejects.toThrow('Only pending invites')
    await expect(members.transferOwnership('o1', 'invite:i1')).rejects.toThrow('has not joined')
    expect(calls).toEqual([])
  })
})
