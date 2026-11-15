// @ts-ignore -- Bun provides this API at runtime; the web app has no Bun test typings.
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { customDomain, link } from '@openlink/db/schema'
import { Context, Effect } from 'effect'
import type { WorkerBindings } from '../env'
import { Bindings } from '../effect/services/bindings'
import type { OrganizationRole } from '../org/permissions'

// Explicitly launched by authorization.test.ts, not discovered by `bun test src`.
// Keep the real router, contracts, serializers, permissions and Effect error wrapper.
const now = new Date('2026-01-01T00:00:00.000Z')
const org = { id: 'org-1', name: 'Workspace', slug: 'workspace', createdAt: now, updatedAt: now }
const domain: typeof customDomain.$inferSelect = {
  id: 'domain-1', organizationId: org.id, hostname: 'go.example.com',
  readiness: 'active', provider: 'memory', providerDomainId: null,
  dnsRecordsJson: '[]', defaultRedirectStatus: 302, activeAt: now,
  createdAt: now, updatedAt: now,
}
const linkRow: typeof link.$inferSelect = {
  id: 'link-1', organizationId: org.id, domainId: domain.id, slug: 'hello', folderId: null,
  alias: null, title: null, description: null, destinationUrl: 'https://example.com/',
  redirectStatus: 302, status: 'active', enabled: true, activateAt: null,
  expiresAt: null, maxClicks: null, clickCount: 0, passwordHash: null,
  expiredDestinationUrl: null, fallbackDestinationUrl: null, tagsJson: '[]',
  utmJson: null, metadataJson: null, createdByUserId: 'user-1', createdAt: now, updatedAt: now,
}
let role: OrganizationRole | null = 'viewer'

let authenticated = true
const session = { session: { user: { id: 'user-1', email: 'user@example.com' } } }
const requireSession = mock((_request: Request) => Effect.succeed(authenticated ? session : null))
const requireOrgMembership = mock((_userId: string, _organizationId: string) =>
  Effect.succeed(role === null ? null : { role }),
)
const getDomainInOrganization = mock((_domainId: string, _organizationId: string) => Effect.succeed(domain))
const getOrganizationById = mock((_organizationId: string) => Effect.succeed(org))
const listOrganizationsForUser = mock((_userId: string) => Effect.succeed([{ organization: org, member: { role, joinedAt: now } }]))
const createMemberInvite = mock((input: { organizationId: string; email: string; role: string; createdByUserId: string }) => Effect.succeed({
  invite: { id: 'invite-1', ...input, expiresAt: now }, token: 'invite-token',
}))
const memberRow = { userId: 'user-2', name: 'Teammate', email: 'mate@example.com', image: null, role: 'member' as const, joinedAt: now }
const inviteRow = { id: 'invite-1', organizationId: org.id, email: 'invitee@example.com', role: 'member' as const, tokenHash: 'h', kind: 'member' as const, expiresAt: now, acceptedAt: null, createdByUserId: null, createdAt: now }
const listMembers = mock((_organizationId: string) => Effect.succeed([memberRow]))
const updateMemberRole = mock((input: { role: 'admin' | 'member' | 'viewer' }) => Effect.succeed({ ...memberRow, role: input.role, previousRole: 'member' as const }))
const removeMember = mock((_input: unknown) => Effect.succeed(memberRow))
const transferOwnership = mock((_input: unknown) => Effect.succeed(memberRow))
const updateOrganization = mock((input: { name?: string }) => Effect.succeed({ ...org, name: input.name ?? org.name }))
const deleteOrganization = mock((_organizationId: string) => Effect.void)
const listPendingInvites = mock((_organizationId: string) => Effect.succeed([inviteRow]))
const revokeInvite = mock((_organizationId: string, _inviteId: string) => Effect.succeed({ id: 'invite-1', email: 'invitee@example.com' }))
const resendInvite = mock((_organizationId: string, _inviteId: string) => Effect.succeed({ invite: inviteRow, token: 'rotated' }))
const folderRow = { id: 'folder-1', organizationId: org.id, parentId: null, name: 'Docs', createdAt: now, updatedAt: now }
const listFolders = mock((_organizationId: string) => Effect.succeed([folderRow]))
const createFolder = mock((input: { name: string }) => Effect.succeed({ ...folderRow, name: input.name }))
const updateFolder = mock((input: { name?: string }) => Effect.succeed({ ...folderRow, name: input.name ?? folderRow.name }))
const deleteFolder = mock((_input: unknown) => Effect.succeed(folderRow))
const ensureFolderInOrganization = mock((_organizationId: string, _folderId: string) => Effect.succeed(folderRow))
const queryOrganizationLinks = mock((_input: unknown) => Effect.succeed({ items: [linkRow], total: 7 }))
const moveLinks = mock((_input: unknown) => Effect.succeed(2))
const addTagsToLinks = mock((_input: unknown) => Effect.succeed(2))
const deleteLinks = mock((_input: unknown) => Effect.succeed(2))
const activityRow = { id: 'evt-1', organizationId: org.id, actorType: 'member' as const, actorUserId: 'user-1', actorLabel: 'Ada', action: 'link.created', category: 'links' as const, targetType: 'link', targetId: 'link-1', targetLabel: 'hello', source: 'dashboard' as const, detailsJson: JSON.stringify({ changes: [{ label: 'Title', from: '—', to: 'Hi' }] }), ipAddress: '203.0.113.9', createdAt: now }
const listActivity = mock((_input: unknown) => Effect.succeed({ items: [activityRow], nextCursor: undefined as string | undefined }))
const audit = mock((_session: unknown, _event: unknown) => Effect.void)
const listDomainsForOrganization = mock((_organizationId: string) => Effect.succeed([domain]))
const registerCustomDomain = mock((_input: unknown) => Effect.succeed(domain))
const removeCustomDomain = mock((_domainId: string, _organizationId: string) => Effect.succeed(true))
const refreshCustomDomain = mock((_domainId: string) => Effect.succeed(domain))
const createLinkRecord = mock((_input: unknown) => Effect.succeed(linkRow))
const getLinkInDomain = mock((_domainId: string, _linkId: string) => Effect.succeed(linkRow))
const listLinksForDomain = mock((_domainId: string) => Effect.succeed([linkRow]))
const updateLinkRecord = mock((existing: typeof linkRow, input: { title?: string; password?: string | null }) => Effect.succeed({
  ...existing, title: input.title ?? existing.title,
  passwordHash: input.password ? 'hashed-password' : existing.passwordHash,
}))
const deleteLinkRecord = mock((_linkId: string) => Effect.void)
const acceptMemberInvite = mock((_input: unknown) => Effect.die(new Error('Unexpected invite acceptance')))
const createOrganizationWithBootstrapInvite = mock((_input: unknown) => Effect.die(new Error('Unexpected organization creation')))
const signIn = mock((_input: unknown) => Effect.die(new Error('Unexpected sign in')))
const signUp = mock((_input: unknown) => Effect.die(new Error('Unexpected sign up')))
const signOut = mock((_request: Request) => Effect.die(new Error('Unexpected sign out')))
const runHealthChecks = mock(() => Effect.die(new Error('Unexpected health check')))
// Boundary workflows are mocked, so infrastructure bindings are intentionally absent.
const requestEffectContext = Effect.succeed(Context.make(Bindings, {
  DOMAIN_PROVIDER: 'memory', EXPOSE_INVITE_TOKENS_IN_API: 'false',
} as WorkerBindings))

mock.module('#/server/auth/session', () => ({ requireSession }))
mock.module('#/server/auth/service', () => ({ signIn, signUp, signOut }))
mock.module('#/server/api/access', () => ({ requireOrgMembership, getDomainInOrganization }))
mock.module('#/server/domain/service', () => ({ listDomainsForOrganization, registerCustomDomain, removeCustomDomain, refreshCustomDomain }))
mock.module('#/server/links/service', () => ({ createLinkRecord, getLinkInDomain, listLinksForDomain, updateLinkRecord, deleteLinkRecord }))
mock.module('#/server/org/service', () => ({
  createMemberInvite, getOrganizationById, listOrganizationsForUser,
  acceptMemberInvite, createOrganizationWithBootstrapInvite,
}))
mock.module('#/server/org/members', () => ({
  listMembers, updateMemberRole, removeMember, transferOwnership, updateOrganization,
  deleteOrganization, listPendingInvites, revokeInvite, resendInvite,
}))
mock.module('#/server/folders/service', () => ({
  listFolders, createFolder, updateFolder, deleteFolder, ensureFolderInOrganization,
}))
mock.module('#/server/links/queries', () => ({ queryOrganizationLinks }))
mock.module('#/server/links/bulk', () => ({ moveLinks, addTagsToLinks, deleteLinks }))
mock.module('#/server/activity/service', () => ({ listActivity }))
mock.module('#/server/activity/audit', () => ({ audit }))
mock.module('#/server/health/checks', () => ({ runHealthChecks }))
mock.module('#/server/effect/runtime', () => ({ requestEffectContext }))

const { handleOpenApiRequest } = await import('./openapi-handler')

const sideEffects = [
  createMemberInvite, registerCustomDomain, removeCustomDomain, refreshCustomDomain,
  createLinkRecord, updateLinkRecord, deleteLinkRecord,
  acceptMemberInvite, createOrganizationWithBootstrapInvite, signIn, signUp, signOut, runHealthChecks,
  updateMemberRole, removeMember, transferOwnership, updateOrganization, deleteOrganization,
  revokeInvite, resendInvite, createFolder, updateFolder, deleteFolder,
  moveLinks, addTagsToLinks, deleteLinks,
]
const spies = [
  ...sideEffects, requireSession, requireOrgMembership, getDomainInOrganization,
  getOrganizationById, listOrganizationsForUser, getLinkInDomain, listLinksForDomain,
  listDomainsForOrganization, listMembers, listPendingInvites,
  listFolders, ensureFolderInOrganization, queryOrganizationLinks, listActivity, audit,
]
beforeEach(() => {
  role = 'viewer'
  authenticated = true
  for (const spy of spies) spy.mockClear()
})

const orgPath = `/organizations/${org.id}`
const domainsPath = `${orgPath}/domains`
const domainPath = `${domainsPath}/${domain.id}`
const linksPath = `${domainPath}/links`
const linkPath = `${linksPath}/${linkRow.id}`
const inviteBody = { email: 'invitee@example.com', role: 'member' }
const createBody = { slug: 'hello', destinationUrl: linkRow.destinationUrl }
const updateBody = { title: 'Updated', password: 'secret-password' }

async function request(method: string, path: string, body?: unknown) {
  const result = await handleOpenApiRequest(new Request(`http://localhost/api/v1${path}`, {
    method,
    ...(body === undefined ? {} : {
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }),
  }))
  expect(result.matched).toBe(true)
  if (!result.response) throw new Error(`No response for ${method} ${path}`)
  return result.response
}

function expectNoSideEffects(allowed: readonly (typeof sideEffects)[number][] = []) {
  for (const spy of sideEffects) {
    expect(spy).toHaveBeenCalledTimes(allowed.includes(spy) ? 1 : 0)
  }
}

const mutations = [
  {
    name: 'create invitation', method: 'POST', path: `${orgPath}/invites`, body: inviteBody,
    status: 201, allowed: ['owner', 'admin'], effects: [createMemberInvite],
    assertWrite: () => expect(createMemberInvite).toHaveBeenCalledWith({
      organizationId: org.id, ...inviteBody, createdByUserId: 'user-1',
    }),
    response: { id: 'invite-1', organizationId: org.id, ...inviteBody },
  },
  {
    name: 'add domain', method: 'POST', path: domainsPath, body: { hostname: domain.hostname },
    status: 201, allowed: ['owner', 'admin'], effects: [registerCustomDomain],
    assertWrite: () => expect(registerCustomDomain).toHaveBeenCalledWith({ organizationId: org.id, hostname: domain.hostname }),
    response: { id: domain.id, hostname: domain.hostname },
  },
  {
    name: 'remove domain', method: 'DELETE', path: domainPath, body: undefined,
    status: 204, allowed: ['owner', 'admin'], effects: [removeCustomDomain],
    assertWrite: () => expect(removeCustomDomain).toHaveBeenCalledWith(domain.id, org.id),
    response: undefined,
  },
  {
    name: 'refresh domain', method: 'POST', path: `${domainPath}/refresh`, body: undefined,
    status: 200, allowed: ['owner', 'admin'], effects: [refreshCustomDomain],
    assertWrite: () => expect(refreshCustomDomain).toHaveBeenCalledWith(domain.id),
    response: { id: domain.id, readiness: 'active' },
  },
  {
    name: 'create link', method: 'POST', path: linksPath, body: createBody,
    status: 201, allowed: ['owner', 'admin', 'member'], effects: [createLinkRecord],
    assertWrite: () => expect(createLinkRecord).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: org.id, domainId: domain.id, userId: 'user-1', ...createBody,
    })),
    response: { id: linkRow.id, ...createBody },
  },
  {
    name: 'update link', method: 'PATCH', path: linkPath, body: updateBody,
    status: 200, allowed: ['owner', 'admin', 'member'], effects: [updateLinkRecord],
    assertWrite: () => expect(updateLinkRecord).toHaveBeenCalledWith(linkRow, updateBody),
    response: { id: linkRow.id, title: updateBody.title, passwordProtected: true },
  },
  {
    name: 'delete link', method: 'DELETE', path: linkPath, body: undefined,
    status: 204, allowed: ['owner', 'admin', 'member'], effects: [deleteLinkRecord],
    assertWrite: () => expect(deleteLinkRecord).toHaveBeenCalledWith(linkRow.id),
    response: undefined,
  },
  {
    name: 'update organization', method: 'PATCH', path: orgPath, body: { name: 'Renamed' },
    status: 200, allowed: ['owner', 'admin'], effects: [updateOrganization],
    assertWrite: () => expect(updateOrganization).toHaveBeenCalledWith({ organizationId: org.id, name: 'Renamed' }),
    response: { id: org.id, name: 'Renamed' },
  },
  {
    name: 'delete organization', method: 'DELETE', path: orgPath, body: undefined,
    status: 204, allowed: ['owner'], effects: [deleteOrganization],
    assertWrite: () => expect(deleteOrganization).toHaveBeenCalledWith(org.id),
    response: undefined,
  },
  {
    name: 'transfer ownership', method: 'POST', path: `${orgPath}/transfer-ownership`, body: { userId: 'user-2' },
    status: 200, allowed: ['owner'], effects: [transferOwnership],
    assertWrite: () => expect(transferOwnership).toHaveBeenCalledWith({ organizationId: org.id, actorUserId: 'user-1', targetUserId: 'user-2' }),
    response: { id: org.id },
  },
  {
    name: 'update member role', method: 'PATCH', path: `${orgPath}/members/user-2`, body: { role: 'viewer' },
    status: 200, allowed: ['owner', 'admin'], effects: [updateMemberRole],
    assertWrite: () => expect(updateMemberRole).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: org.id, targetUserId: 'user-2', role: 'viewer', actorRole: role,
    })),
    response: { userId: 'user-2', role: 'viewer' },
  },
  {
    name: 'remove member', method: 'DELETE', path: `${orgPath}/members/user-2`, body: undefined,
    status: 204, allowed: ['owner', 'admin'], effects: [removeMember],
    assertWrite: () => expect(removeMember).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: org.id, actorUserId: 'user-1', targetUserId: 'user-2',
    })),
    response: undefined,
  },
  {
    name: 'resend invitation', method: 'POST', path: `${orgPath}/invites/invite-1/resend`, body: undefined,
    status: 200, allowed: ['owner', 'admin'], effects: [resendInvite],
    assertWrite: () => expect(resendInvite).toHaveBeenCalledWith(org.id, 'invite-1'),
    response: { id: 'invite-1', organizationId: org.id },
  },
  {
    name: 'revoke invitation', method: 'DELETE', path: `${orgPath}/invites/invite-1`, body: undefined,
    status: 204, allowed: ['owner', 'admin'], effects: [revokeInvite],
    assertWrite: () => expect(revokeInvite).toHaveBeenCalledWith(org.id, 'invite-1'),
    response: undefined,
  },
  {
    name: 'create folder', method: 'POST', path: `${orgPath}/folders`, body: { name: 'Docs' },
    status: 201, allowed: ['owner', 'admin', 'member'], effects: [createFolder],
    assertWrite: () => expect(createFolder).toHaveBeenCalledWith({ organizationId: org.id, name: 'Docs' }),
    response: { id: 'folder-1', name: 'Docs' },
  },
  {
    name: 'update folder', method: 'PATCH', path: `${orgPath}/folders/folder-1`, body: { name: 'Renamed', parentId: null },
    status: 200, allowed: ['owner', 'admin', 'member'], effects: [updateFolder],
    assertWrite: () => expect(updateFolder).toHaveBeenCalledWith({ organizationId: org.id, folderId: 'folder-1', name: 'Renamed', parentId: null }),
    response: { id: 'folder-1', name: 'Renamed' },
  },
  {
    name: 'delete folder', method: 'DELETE', path: `${orgPath}/folders/folder-1?mode=cascade`, body: undefined,
    status: 204, allowed: ['owner', 'admin', 'member'], effects: [deleteFolder],
    assertWrite: () => expect(deleteFolder).toHaveBeenCalledWith({ organizationId: org.id, folderId: 'folder-1', mode: 'cascade' }),
    response: undefined,
  },
  {
    name: 'bulk move links', method: 'POST', path: `${orgPath}/links/move`, body: { linkIds: ['l1', 'l2'], folderId: 'folder-1' },
    status: 200, allowed: ['owner', 'admin', 'member'], effects: [moveLinks],
    assertWrite: () => expect(moveLinks).toHaveBeenCalledWith({ organizationId: org.id, linkIds: ['l1', 'l2'], folderId: 'folder-1' }),
    response: { affected: 2 },
  },
  {
    name: 'bulk add tags', method: 'POST', path: `${orgPath}/links/tags`, body: { linkIds: ['l1'], tags: ['x'] },
    status: 200, allowed: ['owner', 'admin', 'member'], effects: [addTagsToLinks],
    assertWrite: () => expect(addTagsToLinks).toHaveBeenCalledWith({ organizationId: org.id, linkIds: ['l1'], tags: ['x'] }),
    response: { affected: 2 },
  },
  {
    name: 'bulk delete links', method: 'POST', path: `${orgPath}/links/delete`, body: { linkIds: ['l1'] },
    status: 200, allowed: ['owner', 'admin', 'member'], effects: [deleteLinks],
    assertWrite: () => expect(deleteLinks).toHaveBeenCalledWith({ organizationId: org.id, linkIds: ['l1'] }),
    response: { affected: 2 },
  },
] as const

const roles = ['owner', 'admin', 'member', 'viewer', null] as const
for (const endpoint of mutations) {
  describe(endpoint.name, () => {
    for (const actor of roles) {
      const permitted = endpoint.allowed.some((allowed) => allowed === actor)
      test(`${actor ?? 'non-member'} ${permitted ? 'succeeds' : 'is forbidden without side effects'}`, async () => {
        role = actor
        const response = await request(endpoint.method, endpoint.path, endpoint.body)
        expect(response.status).toBe(permitted ? endpoint.status : 403)
        expect(requireOrgMembership).toHaveBeenCalledWith('user-1', org.id)
        if (!permitted) {
          expect(await response.json()).toMatchObject({ code: 'FORBIDDEN' })
          expectNoSideEffects()
          expect(getDomainInOrganization).not.toHaveBeenCalled()
          expect(getLinkInDomain).not.toHaveBeenCalled()
        } else {
          endpoint.assertWrite()
          expectNoSideEffects(endpoint.effects)
          if (endpoint.response) expect(await response.json()).toMatchObject(endpoint.response)
          else expect(await response.json()).toEqual({})
        }
      })
    }
  })
}

for (const actor of ['owner', 'admin'] as const) {
  test(`${actor} cannot invite an owner (HTTP input validation)`, async () => {
    role = actor
    const response = await request('POST', `${orgPath}/invites`, { ...inviteBody, role: 'owner' })
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'BAD_REQUEST' })
    expect(requireSession).not.toHaveBeenCalled()
    expect(requireOrgMembership).not.toHaveBeenCalled()
    expectNoSideEffects()
  })
}

const reads = [
  { name: 'list organizations', path: '/organizations', expected: { items: [{ role: 'viewer', organization: { id: org.id } }] }, read: listOrganizationsForUser, args: ['user-1'] },
  { name: 'get organization', path: orgPath, expected: { id: org.id }, read: getOrganizationById, args: [org.id] },
  { name: 'list domains', path: domainsPath, expected: { items: [{ id: domain.id }] }, read: listDomainsForOrganization, args: [org.id] },
  { name: 'get domain', path: domainPath, expected: { id: domain.id }, read: getDomainInOrganization, args: [domain.id, org.id] },
  { name: 'list folders', path: `${orgPath}/folders`, expected: { items: [{ id: 'folder-1', name: 'Docs' }] }, read: listFolders, args: [org.id] },
  { name: 'search workspace links', path: `${orgPath}/links`, expected: { total: 7, items: [{ id: linkRow.id }] }, read: queryOrganizationLinks, args: [{ organizationId: org.id }] },
  { name: 'list links', path: linksPath, expected: { items: [{ id: linkRow.id }] }, read: listLinksForDomain, args: [domain.id] },
  { name: 'get link', path: linkPath, expected: { id: linkRow.id }, read: getLinkInDomain, args: [domain.id, linkRow.id] },
] as const
for (const endpoint of reads) {
  test(`viewer can ${endpoint.name}`, async () => {
    const response = await request('GET', endpoint.path)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject(endpoint.expected)
    expect(endpoint.read).toHaveBeenCalledWith(...endpoint.args)
    expect(requireSession).toHaveBeenCalledWith(expect.any(Request))
    if (endpoint.path !== '/organizations') {
      expect(requireOrgMembership).toHaveBeenCalledWith('user-1', org.id)
    }
    expectNoSideEffects()
  })

  test(`unauthenticated caller cannot ${endpoint.name}`, async () => {
    authenticated = false
    const response = await request('GET', endpoint.path)
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: 'UNAUTHORIZED' })
    expect(requireSession).toHaveBeenCalledWith(expect.any(Request))
    expect(requireOrgMembership).not.toHaveBeenCalled()
    expect(endpoint.read).not.toHaveBeenCalled()
    expectNoSideEffects()
  })

  if (endpoint.path !== '/organizations') {
    test(`non-member cannot ${endpoint.name}`, async () => {
      role = null
      const response = await request('GET', endpoint.path)
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({ code: 'FORBIDDEN' })
      expect(requireOrgMembership).toHaveBeenCalledWith('user-1', org.id)
      expect(endpoint.read).not.toHaveBeenCalled()
      expectNoSideEffects()
    })
  }
}

test('any member may leave the workspace themselves', async () => {
  role = 'viewer'
  const response = await request('DELETE', `${orgPath}/members/user-1`)
  expect(response.status).toBe(204)
  expect(removeMember).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 'user-1', targetUserId: 'user-1', actorRole: 'viewer' }))
})

test('invite tokens are only returned when exposure is enabled', async () => {
  role = 'admin'
  const response = await request('POST', `${orgPath}/invites/invite-1/resend`)
  expect(await response.json()).not.toHaveProperty('token')
})

test('domain errors from member workflows map to typed HTTP errors', async () => {
  role = 'admin'
  updateMemberRole.mockImplementationOnce(() => Effect.fail({ _tag: 'MemberPermissionDenied', reason: 'You cannot assign this role' }) as never)
  let response = await request('PATCH', `${orgPath}/members/user-2`, { role: 'admin' })
  expect(response.status).toBe(403)
  expect(await response.json()).toMatchObject({ code: 'FORBIDDEN', message: 'You cannot assign this role' })
  updateMemberRole.mockImplementationOnce(() => Effect.fail({ _tag: 'MemberNotFound' }) as never)
  response = await request('PATCH', `${orgPath}/members/ghost`, { role: 'member' })
  expect(response.status).toBe(404)
  revokeInvite.mockImplementationOnce(() => Effect.fail({ _tag: 'InviteNotFound' }) as never)
  response = await request('DELETE', `${orgPath}/invites/missing`)
  expect(response.status).toBe(404)
})

test('an owner role cannot be assigned through the API', async () => {
  role = 'owner'
  const response = await request('PATCH', `${orgPath}/members/user-2`, { role: 'owner' })
  expect(response.status).toBe(400)
  expect(updateMemberRole).not.toHaveBeenCalled()
})

test('members can be listed by viewers, invites only by admins', async () => {
  role = 'viewer'
  let response = await request('GET', `${orgPath}/members`)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ items: [{ userId: 'user-2', role: 'member' }] })
  response = await request('GET', `${orgPath}/invites`)
  expect(response.status).toBe(403)
  expect(listPendingInvites).not.toHaveBeenCalled()
  role = 'admin'
  response = await request('GET', `${orgPath}/invites`)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ items: [{ id: 'invite-1' }] })
  expect(await (await request('GET', `${orgPath}/invites`)).text()).not.toContain('tokenHash')
})

test('links can only be filed into folders of their own workspace', async () => {
  role = 'member'
  ensureFolderInOrganization.mockImplementationOnce(() => Effect.fail({ _tag: 'FolderNotFound' }) as never)
  let response = await request('POST', linksPath, { ...createBody, folderId: 'foreign' })
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ message: 'Folder not found' })
  expect(createLinkRecord).not.toHaveBeenCalled()

  response = await request('POST', linksPath, { ...createBody, folderId: 'folder-1' })
  expect(response.status).toBe(201)
  expect(ensureFolderInOrganization).toHaveBeenCalledWith(org.id, 'folder-1')
  expect(createLinkRecord).toHaveBeenCalledWith(expect.objectContaining({ folderId: 'folder-1' }))
})

test('moving a link to the root skips the folder lookup', async () => {
  role = 'member'
  const response = await request('PATCH', linkPath, { folderId: null })
  expect(response.status).toBe(200)
  expect(ensureFolderInOrganization).not.toHaveBeenCalled()
  expect(updateLinkRecord).toHaveBeenCalledWith(linkRow, { folderId: null })
})

test('folder workflow failures map to typed HTTP errors', async () => {
  role = 'member'
  const cases = [
    [{ _tag: 'FolderNotFound' }, 404, 'NOT_FOUND'],
    [{ _tag: 'FolderRuleViolation', message: 'Folders can only be nested 10 levels deep.' }, 400, 'BAD_REQUEST'],
    [{ _tag: 'FolderNameTaken' }, 409, 'CONFLICT'],
  ] as const
  for (const [failure, status, code] of cases) {
    updateFolder.mockImplementationOnce(() => Effect.fail(failure) as never)
    const response = await request('PATCH', `${orgPath}/folders/folder-1`, { name: 'x' })
    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({ code })
  }
  deleteFolder.mockImplementationOnce(() => Effect.fail({ _tag: 'FolderNotFound' }) as never)
  expect((await request('DELETE', `${orgPath}/folders/missing`)).status).toBe(404)
})

test('workspace link search parses query parameters', async () => {
  role = 'viewer'
  const response = await request('GET', `${orgPath}/links?q=launch&folderId=root&tag=q4&status=expired&limit=25&offset=50`)
  expect(response.status).toBe(200)
  expect(queryOrganizationLinks).toHaveBeenCalledWith({
    organizationId: org.id, q: 'launch', folderId: 'root', tag: 'q4', status: 'expired', limit: 25, offset: 50,
  })
})

test('workspace link search rejects unknown statuses and non-numeric paging', async () => {
  role = 'viewer'
  expect((await request('GET', `${orgPath}/links?status=archived`)).status).toBe(400)
  expect((await request('GET', `${orgPath}/links?limit=lots`)).status).toBe(400)
  expect(queryOrganizationLinks).not.toHaveBeenCalled()
})

test('bulk requests are bounded and need at least one id', async () => {
  role = 'member'
  expect((await request('POST', `${orgPath}/links/delete`, { linkIds: [] })).status).toBe(400)
  expect((await request('POST', `${orgPath}/links/delete`, { linkIds: Array.from({ length: 201 }, (_, i) => `l${i}`) })).status).toBe(400)
  expect((await request('POST', `${orgPath}/links/tags`, { linkIds: ['l1'], tags: [] })).status).toBe(400)
  expect(deleteLinks).not.toHaveBeenCalled()
  expect(addTagsToLinks).not.toHaveBeenCalled()
})

test('bulk move validates the destination folder belongs to the workspace', async () => {
  role = 'member'
  ensureFolderInOrganization.mockImplementationOnce(() => Effect.fail({ _tag: 'FolderNotFound' }) as never)
  const response = await request('POST', `${orgPath}/links/move`, { linkIds: ['l1'], folderId: 'foreign' })
  expect(response.status).toBe(400)
  expect(moveLinks).not.toHaveBeenCalled()
  expect((await request('POST', `${orgPath}/links/move`, { linkIds: ['l1'], folderId: null })).status).toBe(200)
})

const auditedMutations = [
  { name: 'create invitation', method: 'POST', path: `${orgPath}/invites`, body: inviteBody, action: 'member.invited' },
  { name: 'add domain', method: 'POST', path: domainsPath, body: { hostname: domain.hostname }, action: 'domain.added' },
  { name: 'remove domain', method: 'DELETE', path: domainPath, body: undefined, action: 'domain.removed' },
  { name: 'create link', method: 'POST', path: linksPath, body: createBody, action: 'link.created' },
  { name: 'delete link', method: 'DELETE', path: linkPath, body: undefined, action: 'link.deleted' },
  { name: 'create folder', method: 'POST', path: `${orgPath}/folders`, body: { name: 'Docs' }, action: 'folder.created' },
  { name: 'update folder', method: 'PATCH', path: `${orgPath}/folders/folder-1`, body: { name: 'New' }, action: 'folder.updated' },
  { name: 'delete folder', method: 'DELETE', path: `${orgPath}/folders/folder-1`, body: undefined, action: 'folder.deleted' },
  { name: 'update member role', method: 'PATCH', path: `${orgPath}/members/user-2`, body: { role: 'viewer' }, action: 'member.role_changed' },
  { name: 'remove member', method: 'DELETE', path: `${orgPath}/members/user-2`, body: undefined, action: 'member.removed' },
  { name: 'revoke invitation', method: 'DELETE', path: `${orgPath}/invites/invite-1`, body: undefined, action: 'invite.revoked' },
  { name: 'update workspace', method: 'PATCH', path: orgPath, body: { name: 'Renamed' }, action: 'workspace.updated' },
  { name: 'transfer ownership', method: 'POST', path: `${orgPath}/transfer-ownership`, body: { userId: 'user-2' }, action: 'workspace.ownership_transferred' },
  { name: 'bulk move', method: 'POST', path: `${orgPath}/links/move`, body: { linkIds: ['l1'], folderId: null }, action: 'link.moved' },
  { name: 'bulk tag', method: 'POST', path: `${orgPath}/links/tags`, body: { linkIds: ['l1'], tags: ['x'] }, action: 'link.tagged' },
  { name: 'bulk delete', method: 'POST', path: `${orgPath}/links/delete`, body: { linkIds: ['l1'] }, action: 'link.deleted' },
] as const
for (const endpoint of auditedMutations) {
  test(`${endpoint.name} writes a ${endpoint.action} audit event for the actor`, async () => {
    role = 'owner'
    const response = await request(endpoint.method, endpoint.path, endpoint.body)
    expect(response.status).toBeLessThan(300)
    expect(audit).toHaveBeenCalledTimes(1)
    expect(audit).toHaveBeenCalledWith(session, expect.objectContaining({ organizationId: org.id, action: endpoint.action }))
  })
  test(`${endpoint.name} writes nothing when the caller is forbidden`, async () => {
    role = 'viewer'
    const response = await request(endpoint.method, endpoint.path, endpoint.body)
    expect(response.status).toBe(403)
    expect(audit).not.toHaveBeenCalled()
  })
}

test('role changes and link edits carry before/after changes', async () => {
  role = 'owner'
  await request('PATCH', `${orgPath}/members/user-2`, { role: 'viewer' })
  expect(audit).toHaveBeenLastCalledWith(session, expect.objectContaining({
    target: { type: 'member', id: 'user-2', label: 'Teammate' },
    changes: [{ label: 'Role', from: 'member', to: 'viewer' }],
  }))
  await request('PATCH', linkPath, { title: 'Updated' })
  expect(audit).toHaveBeenLastCalledWith(session, expect.objectContaining({
    action: 'link.updated',
    changes: [{ label: 'Title', from: '—', to: 'Updated' }],
  }))
})

test('a link edit that changes nothing is not audited', async () => {
  role = 'owner'
  updateLinkRecord.mockImplementationOnce((existing) => Effect.succeed(existing))
  await request('PATCH', linkPath, {})
  expect(audit).not.toHaveBeenCalled()
})

test('a failed workflow is not audited', async () => {
  role = 'owner'
  createLinkRecord.mockImplementationOnce(() => Effect.fail({ _tag: 'SlugConflict' }) as never)
  expect((await request('POST', linksPath, createBody)).status).toBe(409)
  expect(audit).not.toHaveBeenCalled()
})

test('the activity feed hides IP addresses from non-admins and forwards filters', async () => {
  role = 'member'
  let response = await request('GET', `${orgPath}/activity?category=links&limit=10&cursor=abc`)
  expect(response.status).toBe(200)
  expect(listActivity).toHaveBeenCalledWith({ organizationId: org.id, category: 'links', limit: 10, cursor: 'abc' })
  let body = await response.json()
  expect(body.items[0]).toMatchObject({
    action: 'link.created', phrase: 'created link', actor: { type: 'member', label: 'Ada' },
    target: { type: 'link', id: 'link-1', label: 'hello' }, changes: [{ label: 'Title', to: 'Hi' }],
  })
  expect(body.items[0]).not.toHaveProperty('ipAddress')
  role = 'admin'
  body = await (await request('GET', `${orgPath}/activity`)).json()
  expect(body.items[0].ipAddress).toBe('203.0.113.9')
})

test('the activity feed requires membership and a valid category', async () => {
  role = null
  expect((await request('GET', `${orgPath}/activity`)).status).toBe(403)
  role = 'viewer'
  expect((await request('GET', `${orgPath}/activity?category=billing`)).status).toBe(400)
  expect(listActivity).not.toHaveBeenCalled()
})

test('link history is scoped to the link and verifies it belongs to the domain', async () => {
  role = 'viewer'
  const response = await request('GET', `${linkPath}/history`)
  expect(response.status).toBe(200)
  expect(listActivity).toHaveBeenCalledWith({ organizationId: org.id, target: { type: 'link', id: linkRow.id }, limit: 100 })
  getLinkInDomain.mockImplementationOnce(() => Effect.succeed(null as never))
  expect((await request('GET', `${linkPath}/history`)).status).toBe(404)
})

// catchTags matches structural tags; do not load real service modules just for error constructors.
const typedFailures = [
  {
    name: 'invalid bootstrap invite', workflow: createOrganizationWithBootstrapInvite,
    path: '/organizations', body: { name: org.name, slug: org.slug, inviteToken: 'invalid-token' },
    tag: 'InvalidBootstrapInvite', status: 403, code: 'FORBIDDEN', message: 'Invalid or expired bootstrap invite token',
  },
  {
    name: 'organization conflict', workflow: createOrganizationWithBootstrapInvite,
    path: '/organizations', body: { name: org.name, slug: org.slug, inviteToken: 'invite-token' },
    tag: 'OrganizationConflict', status: 409, code: 'CONFLICT', message: 'Unable to create organization',
  },
  {
    name: 'organization backend failure', workflow: createOrganizationWithBootstrapInvite,
    path: '/organizations', body: { name: org.name, slug: org.slug, inviteToken: 'invite-token' },
    tag: 'BackendError', status: 409, code: 'CONFLICT', message: 'Unable to create organization',
  },
  {
    name: 'invite email mismatch', workflow: acceptMemberInvite,
    path: '/organizations/invites/accept', body: { token: 'invite-token' },
    tag: 'InviteEmailMismatch', status: 403, code: 'FORBIDDEN', message: 'This invite was sent to a different email address',
  },
  {
    name: 'invalid invite', workflow: acceptMemberInvite,
    path: '/organizations/invites/accept', body: { token: 'invalid-token' },
    tag: 'InvalidInvite', status: 400, code: 'BAD_REQUEST', message: 'Invalid or expired invite',
  },
  {
    name: 'invite backend failure', workflow: acceptMemberInvite,
    path: '/organizations/invites/accept', body: { token: 'invite-token' },
    tag: 'BackendError', status: 400, code: 'BAD_REQUEST', message: 'Invalid or expired invite',
  },
  {
    name: 'domain backend failure', workflow: registerCustomDomain,
    path: domainsPath, body: { hostname: domain.hostname },
    tag: 'BackendError', status: 400, code: 'BAD_REQUEST', message: 'Unable to register domain',
  },
  {
    name: 'slug conflict', workflow: createLinkRecord,
    path: linksPath, body: createBody,
    tag: 'SlugConflict', status: 409, code: 'CONFLICT', message: 'Slug already exists on this domain',
  },
  {
    name: 'link backend failure', workflow: createLinkRecord,
    path: linksPath, body: createBody,
    tag: 'BackendError', status: 400, code: 'BAD_REQUEST', message: 'Unable to create link',
  },
] as const

for (const failure of typedFailures) {
  test(`${failure.name} maps to HTTP ${failure.status}`, async () => {
    role = 'owner'
    failure.workflow.mockImplementationOnce(() => Effect.fail({ _tag: failure.tag }))
    const response = await request('POST', failure.path, failure.body)
    expect(response.status).toBe(failure.status)
    expect(await response.json()).toMatchObject({ code: failure.code, message: failure.message })
    expectNoSideEffects([failure.workflow])
  })
}
