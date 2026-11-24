import { describe, expect, test } from 'bun:test'

import {
  WORKSPACE_ROLES,
  assignableRoles,
  canManageApiKeys,
  canManageDomains,
  canManageLinks,
  canManageMember,
  canManageWorkspace,
  isAdmin,
  isOwner,
} from './permissions'

const as = {
  owner: 'owner',
  admin: 'admin',
  member: 'member',
  viewer: 'viewer',
} as const

describe('pure workspace permissions', () => {
  test('the admin rank is owner and admin', () => {
    expect(isAdmin(as.owner)).toBe(true)
    expect(isAdmin(as.admin)).toBe(true)
    expect(isAdmin(as.member)).toBe(false)
    expect(isAdmin(as.viewer)).toBe(false)
  })

  test('only owners are owners', () => {
    expect(isOwner(as.owner)).toBe(true)
    for (const role of ['admin', 'member', 'viewer'] as const) expect(isOwner(role)).toBe(false)
  })

  test('link writers are owner, admin and member', () => {
    expect(isAdmin(as.owner)).toBe(true)
    for (const role of ['owner', 'admin', 'member'] as const) expect(canManageLinks(role)).toBe(true)
    expect(canManageLinks(as.viewer)).toBe(false)
  })

  test('domains, workspace settings and API keys need the admin rank', () => {
    for (const role of ['owner', 'admin'] as const) {
      expect(canManageDomains(role)).toBe(true)
      expect(canManageWorkspace(role)).toBe(true)
      expect(canManageApiKeys(role)).toBe(true)
    }
    for (const role of ['member', 'viewer'] as const) {
      expect(canManageDomains(role)).toBe(false)
      expect(canManageWorkspace(role)).toBe(false)
      expect(canManageApiKeys(role)).toBe(false)
    }
  })

  test('roles handed out by each rank', () => {
    expect(assignableRoles(as.owner)).toEqual(['admin', 'member', 'viewer'])
    expect(assignableRoles(as.admin)).toEqual(['member', 'viewer'])
    expect(assignableRoles(as.member)).toEqual([])
    expect(assignableRoles(as.viewer)).toEqual([])
  })

  test('owners manage everyone but owners; admins manage only members and viewers', () => {
    expect(WORKSPACE_ROLES.filter((target) => canManageMember(as.owner, target))).toEqual([
      'admin',
      'member',
      'viewer',
    ])
    expect(WORKSPACE_ROLES.filter((target) => canManageMember(as.admin, target))).toEqual(['member', 'viewer'])
    for (const actor of ['member', 'viewer'] as const) {
      expect(WORKSPACE_ROLES.some((target) => canManageMember(actor, target))).toBe(false)
    }
  })
})
