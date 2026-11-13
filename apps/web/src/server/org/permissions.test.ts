import { describe, expect, test } from 'bun:test'
import { canManageLinks, isAdmin, type OrganizationRole } from './permissions'

const roles: OrganizationRole[] = ['owner', 'admin', 'member', 'viewer']

describe('workspace permissions', () => {
  test.each(roles)('%s has the expected administrative permissions', (role) => {
    expect(isAdmin(role)).toBe(role === 'owner' || role === 'admin')
  })

  test.each(roles)('%s has the expected link-write permissions', (role) => {
    expect(canManageLinks(role)).toBe(role !== 'viewer')
  })
})
