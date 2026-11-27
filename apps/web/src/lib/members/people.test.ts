import { describe, expect, test } from 'bun:test'

import { toPeople } from './people'

const member = { userId: 'u2', name: 'Bob', email: 'bob@e.test', role: 'member', joinedAt: '2026-01-01T00:00:00.000Z' } as const
const invite = { id: 'i1', organizationId: 'o1', email: 'new@e.test', role: 'viewer', expiresAt: '2026-02-01T00:00:00.000Z', createdAt: '2026-01-02T00:00:00.000Z' } as const

describe('toPeople', () => {
  test('members and invites share one list, each keeping what its actions need', () => {
    const people = toPeople([member], [invite])
    expect(people).toEqual([
      { kind: 'member', key: 'member:u2', userId: 'u2', name: 'Bob', email: 'bob@e.test', role: 'member', since: member.joinedAt },
      { kind: 'invite', key: 'invite:i1', inviteId: 'i1', name: 'new@e.test', email: 'new@e.test', role: 'viewer', since: invite.createdAt },
    ])
  })

  test('keys never collide between a member and an invite with the same id', () => {
    const [a, b] = toPeople([{ ...member, userId: 'x' }], [{ ...invite, id: 'x' }])
    expect(a!.key).not.toBe(b!.key)
  })

  test('uses the email when a member has no display name for avatar initials', () => {
    const [person] = toPeople([{ ...member, name: '   ' }], [])
    expect(person?.name).toBe(member.email)
  })
})
