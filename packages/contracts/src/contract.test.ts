import { describe, expect, test } from 'bun:test'
import { contract } from './contract'

describe('oRPC OpenAPI contract', () => {
  test('groups procedures by domain', () => {
    expect(contract.system.getHealth).toBeDefined()
    expect(contract.system.getOpenApiDocument).toBeDefined()
    expect(contract.auth.signIn).toBeDefined()
    expect(contract.organizations.listOrganizations).toBeDefined()
    expect(contract.links.createLink).toBeDefined()
  })

  test('covers organization, domain, and link surfaces', () => {
    expect(contract.organizations.getOrganization).toBeDefined()
    expect(contract.domains.addDomain).toBeDefined()
    expect(contract.domains.refreshDomainStatus).toBeDefined()
    expect(contract.links.updateLink).toBeDefined()
  })

  test('covers workspace member and invite management', () => {
    expect(contract.organizations.listMembers).toBeDefined()
    expect(contract.organizations.updateMemberRole).toBeDefined()
    expect(contract.organizations.removeMember).toBeDefined()
    expect(contract.organizations.transferOwnership).toBeDefined()
    expect(contract.organizations.deleteOrganization).toBeDefined()
    expect(contract.organizations.revokeOrganizationInvite).toBeDefined()
  })
})

describe('folders contract', () => {
  test('covers folder CRUD', () => {
    expect(contract.folders.listFolders).toBeDefined()
    expect(contract.folders.createFolder).toBeDefined()
    expect(contract.folders.updateFolder).toBeDefined()
    expect(contract.folders.deleteFolder).toBeDefined()
  })
})

describe('activity contract', () => {
  test('exposes the workspace feed and per-link history', () => {
    expect(contract.activity.listActivity).toBeDefined()
    expect(contract.links.getLinkHistory).toBeDefined()
  })
})

describe('comments contract', () => {
  test('covers the comment thread and reactions', () => {
    expect(contract.comments.listLinkComments).toBeDefined()
    expect(contract.comments.createLinkComment).toBeDefined()
    expect(contract.comments.updateLinkComment).toBeDefined()
    expect(contract.comments.deleteLinkComment).toBeDefined()
    expect(contract.comments.toggleCommentReaction).toBeDefined()
  })
})
