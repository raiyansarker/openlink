import { type } from 'arktype'
import { describe, expect, test } from 'bun:test'
import {
  CreateOrganizationInviteRequest,
  OrganizationInvite,
  OrganizationRole,
} from './schema'

const roles = ['owner', 'admin', 'member', 'viewer'] as const

describe('organization roles', () => {
  test.each(roles)('recognizes the %s membership role', (role) => {
    expect(OrganizationRole(role)).toBe(role)
  })

  test.each(['admin', 'member', 'viewer'])('allows invitations as %s', (role) => {
    const input = { email: 'teammate@example.com', role }
    expect(CreateOrganizationInviteRequest(input)).toEqual(input)
  })

  test('ownership cannot be granted through an invitation', () => {
    expect(
      CreateOrganizationInviteRequest({ email: 'teammate@example.com', role: 'owner' }),
    ).toBeInstanceOf(type.errors)
    expect(
      OrganizationInvite({
        id: 'invite-1',
        organizationId: 'org-1',
        email: 'teammate@example.com',
        role: 'owner',
        expiresAt: '2026-12-01T00:00:00.000Z',
      }),
    ).toBeInstanceOf(type.errors)
  })

  test('rejects unknown roles', () => {
    expect(OrganizationRole('superadmin')).toBeInstanceOf(type.errors)
  })
})
