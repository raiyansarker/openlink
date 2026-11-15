import { type } from 'arktype'
import { describe, expect, test } from 'bun:test'
import {
  CreateOrganizationInviteRequest,
  OrganizationInvite,
  OrganizationRole,
  UpdateMemberRoleRequest,
  UpdateOrganizationRequest,
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

describe('workspace management requests', () => {
  test('owner cannot be assigned through a role update', () => {
    expect(UpdateMemberRoleRequest({ role: 'owner' })).toBeInstanceOf(type.errors)
    expect(UpdateMemberRoleRequest({ role: 'viewer' })).toEqual({ role: 'viewer' })
  })

  test('organization updates validate the slug and name', () => {
    expect(UpdateOrganizationRequest({ slug: 'Bad Slug' })).toBeInstanceOf(type.errors)
    expect(UpdateOrganizationRequest({ name: '' })).toBeInstanceOf(type.errors)
    expect(UpdateOrganizationRequest({ name: 'Acme', slug: 'acme-co' })).toEqual({
      name: 'Acme',
      slug: 'acme-co',
    })
  })
})
