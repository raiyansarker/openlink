import { describe, expect, test } from 'bun:test'
import {
  assignableRoles,
  canManageLinks,
  canManageMember,
  isAdmin,
  type OrganizationRole,
} from './permissions'

const roles: OrganizationRole[] = ['owner', 'admin', 'member', 'viewer']

describe('workspace permissions', () => {
  test.each(roles)('%s has the expected administrative permissions', (role) => {
    expect(isAdmin(role)).toBe(role === 'owner' || role === 'admin')
  })

  test.each(roles)('%s has the expected link-write permissions', (role) => {
    expect(canManageLinks(role)).toBe(role !== 'viewer')
  })
})

describe('member management permissions', () => {
  test('owners can manage everyone except other owners', () => {
    expect(roles.filter((target) => canManageMember('owner', target))).toEqual(['admin', 'member', 'viewer'])
  })

  test('admins manage members and viewers only', () => {
    expect(roles.filter((target) => canManageMember('admin', target))).toEqual(['member', 'viewer'])
  })

  test.each(['member', 'viewer'] as const)('%s cannot manage anyone', (actor) => {
    expect(roles.some((target) => canManageMember(actor, target))).toBe(false)
  })

  test('only owners may assign the admin role', () => {
    expect(assignableRoles('owner')).toEqual(['admin', 'member', 'viewer'])
    expect(assignableRoles('admin')).toEqual(['member', 'viewer'])
    expect(assignableRoles('member')).toEqual([])
    expect(assignableRoles('viewer')).toEqual([])
  })
})
