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
  utmJson: null, metadataJson: null, deliveryJson: null, createdByUserId: 'user-1', createdAt: now, updatedAt: now,
}
let role: OrganizationRole | null = 'viewer'

let authenticated = true
const session = { session: { user: { id: 'user-1', email: 'user@example.com' }, session: { id: 'sess-current' } } }
/** The principal a cookie request acts as (see effect/principal.ts). */
const cookieActor = expect.objectContaining({ session: { user: session.session.user } })
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
const commentRow = { id: 'c1', organizationId: org.id, linkId: linkRow.id, authorUserId: 'user-1', authorLabel: 'Ada', authorImage: null, body: 'Looks good to me', reactionsJson: '{"👍":["user-2"]}', createdAt: now, editedAt: null }
const listComments = mock((_organizationId: string, _linkId: string) => Effect.succeed([commentRow]))
const createComment = mock((_input: unknown) => Effect.succeed(commentRow))
const updateComment = mock((_input: unknown) => Effect.succeed({ ...commentRow, editedAt: now }))
const deleteComment = mock((_input: unknown) => Effect.succeed(commentRow))
const toggleCommentReaction = mock((_input: unknown) => Effect.succeed(commentRow))
const keyRow = { id: 'key-1', organizationId: org.id, name: 'CI deploy', prefix: 'ol_live_8f3a', keyHash: 'h', role: 'member' as const, createdByUserId: 'user-1', createdAt: now, lastUsedAt: null }
let keyPrincipal: { id: string; organizationId: string; role: 'admin' | 'member' | 'viewer'; name: string } | null = null
const authenticateApiKey = mock((_secret: string) => Effect.succeed(keyPrincipal))
const listApiKeys = mock((_organizationId: string) => Effect.succeed([keyRow]))
const createApiKey = mock((input: { name: string; role: 'admin' | 'member' | 'viewer' }) => Effect.succeed({ row: { ...keyRow, ...input }, secret: 'ol_live_secret-value' }))
const updateApiKeyRole = mock((input: { role: 'admin' | 'member' | 'viewer' }) => Effect.succeed({ row: { ...keyRow, role: input.role }, previousRole: 'member' as const }))
const revokeApiKey = mock((_organizationId: string, _keyId: string) => Effect.succeed(keyRow))
const deviceRow = { id: 'sess-current', ipAddress: '203.0.113.7', userAgent: 'UA', city: 'Dhaka', country: 'BD', latitude: 23.8, longitude: 90.4, signInMethod: 'github', createdAt: now, updatedAt: now, expiresAt: now }
const listDeviceSessions = mock((_userId: string) => Effect.succeed([deviceRow, { ...deviceRow, id: 'sess-laptop', city: null, latitude: null, longitude: null }]))
const revokeDeviceSession = mock((_input: unknown) => Effect.void)
const revokeOtherDeviceSessions = mock((_input: unknown) => Effect.succeed(2))
const listDomainsForOrganization = mock((_organizationId: string) => Effect.succeed([domain]))
const registerCustomDomain = mock((_input: unknown) => Effect.succeed(domain))
const removeCustomDomain = mock((_domainId: string, _organizationId: string) => Effect.succeed(true))
const refreshCustomDomain = mock((_domainId: string) => Effect.succeed(domain))
const createLinkRecord = mock((_input: unknown) => Effect.succeed(linkRow))
const getLinkInDomain = mock((_domainId: string, _linkId: string) => Effect.succeed(linkRow))
const getLinkInOrganization = mock((_organizationId: string, _linkId: string) => Effect.succeed(linkRow as typeof linkRow | null))
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
mock.module('#/server/links/service', () => ({ createLinkRecord, getLinkInDomain, getLinkInOrganization, listLinksForDomain, updateLinkRecord, deleteLinkRecord }))
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
mock.module('#/server/comments/service', () => ({
  listComments, createComment, updateComment, deleteComment, toggleCommentReaction,
}))
mock.module('#/server/apikeys/service', () => ({
  authenticateApiKey, listApiKeys, createApiKey, updateApiKeyRole, revokeApiKey,
}))
mock.module('#/server/devices/sessions', () => ({
  DeviceSessions: { list: listDeviceSessions, revoke: revokeDeviceSession, revokeOthers: revokeOtherDeviceSessions },
}))
mock.module('#/server/health/checks', () => ({ runHealthChecks }))
mock.module('#/server/effect/runtime', () => ({ requestEffectContext }))

const { handleOpenApiRequest } = await import('./openapi-handler')
const { ApiClient } = await import('#/lib/api/client')
const { ApiError } = await import('#/lib/api/error')

const sideEffects = [
  createMemberInvite, registerCustomDomain, removeCustomDomain, refreshCustomDomain,
  createLinkRecord, updateLinkRecord, deleteLinkRecord,
  acceptMemberInvite, createOrganizationWithBootstrapInvite, signIn, signUp, signOut, runHealthChecks,
  updateMemberRole, removeMember, transferOwnership, updateOrganization, deleteOrganization,
  revokeInvite, resendInvite, createFolder, updateFolder, deleteFolder,
  moveLinks, addTagsToLinks, deleteLinks, createComment, updateComment, deleteComment, toggleCommentReaction,
  createApiKey, updateApiKeyRole, revokeApiKey, revokeDeviceSession, revokeOtherDeviceSessions,
]
const spies = [
  ...sideEffects, requireSession, requireOrgMembership, getDomainInOrganization,
  getOrganizationById, listOrganizationsForUser, getLinkInDomain, listLinksForDomain,
  listDomainsForOrganization, listMembers, listPendingInvites,
  listFolders, ensureFolderInOrganization, queryOrganizationLinks, listActivity, audit, listComments, authenticateApiKey, listApiKeys, listDeviceSessions, getLinkInOrganization,
]
beforeEach(() => {
  role = 'viewer'
  authenticated = true
  keyPrincipal = null
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

async function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const result = await handleOpenApiRequest(new Request(`http://localhost/api/v1${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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
          else expect(response.status === 204 ? response.body : await response.json()).toEqual(response.status === 204 ? null : {})
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
    expect(audit).toHaveBeenCalledWith(cookieActor, expect.objectContaining({ organizationId: org.id, action: endpoint.action }))
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
  expect(audit).toHaveBeenLastCalledWith(cookieActor, expect.objectContaining({
    target: { type: 'member', id: 'user-2', label: 'Teammate' },
    changes: [{ label: 'Role', from: 'member', to: 'viewer' }],
  }))
  await request('PATCH', linkPath, { title: 'Updated' })
  expect(audit).toHaveBeenLastCalledWith(cookieActor, expect.objectContaining({
    action: 'link.updated',
    changes: [{ label: 'Title', from: '—', to: 'Updated' }],
  }))
})

test('a link edit that changes nothing is not audited', async () => {
  role = 'owner'
  updateLinkRecord.mockImplementationOnce((existing: typeof linkRow) => Effect.succeed(existing))
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
  let body = (await response.json()) as { items: Record<string, unknown>[] }
  expect(body.items[0]).toMatchObject({
    action: 'link.created', phrase: 'created link', actor: { type: 'member', label: 'Ada' },
    target: { type: 'link', id: 'link-1', label: 'hello' }, changes: [{ label: 'Title', to: 'Hi' }],
  })
  expect(body.items[0]).not.toHaveProperty('ipAddress')
  role = 'admin'
  body = (await (await request('GET', `${orgPath}/activity`)).json()) as { items: Record<string, unknown>[] }
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

const commentsPath = `${linkPath}/comments`

describe('link comments', () => {
  test('every member can read the thread, with reactions and author data', async () => {
    role = 'viewer'
    const response = await request('GET', commentsPath)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      items: [{ id: 'c1', authorId: 'user-1', authorName: 'Ada', body: 'Looks good to me', reactions: { '👍': ['user-2'] } }],
    })
    expect(listComments).toHaveBeenCalledWith(org.id, linkRow.id)
  })

  test('unknown links do not leak a thread', async () => {
    role = 'viewer'
    getLinkInDomain.mockImplementationOnce(() => Effect.succeed(null as never))
    expect((await request('GET', commentsPath)).status).toBe(404)
    expect(listComments).not.toHaveBeenCalled()
  })

  for (const actor of ['owner', 'admin', 'member', 'viewer', null] as const) {
    const permitted = actor !== 'viewer' && actor !== null
    test(`${actor ?? 'non-member'} ${permitted ? 'can' : 'cannot'} comment`, async () => {
      role = actor
      const response = await request('POST', commentsPath, { body: 'Ship it' })
      expect(response.status).toBe(permitted ? 201 : 403)
      expect(createComment).toHaveBeenCalledTimes(permitted ? 1 : 0)
      if (permitted) {
        expect(createComment).toHaveBeenCalledWith({
          organizationId: org.id, linkId: linkRow.id, body: 'Ship it', author: { id: 'user-1', label: 'user@example.com' },
        })
        expect(audit).toHaveBeenCalledWith(cookieActor, expect.objectContaining({
          action: 'link.commented', changes: [{ label: 'Comment', from: '—', to: 'Looks good to me' }],
        }))
      } else {
        expect(audit).not.toHaveBeenCalled()
      }
    })
  }

  test('empty and oversized bodies are rejected before the service runs', async () => {
    role = 'member'
    expect((await request('POST', commentsPath, { body: '' })).status).toBe(400)
    expect((await request('POST', commentsPath, { body: 'x'.repeat(4001) })).status).toBe(400)
    expect(createComment).not.toHaveBeenCalled()
  })

  test('editing passes the actor so only the author succeeds', async () => {
    role = 'member'
    expect((await request('PATCH', `${commentsPath}/c1`, { body: 'Edited' })).status).toBe(200)
    expect(updateComment).toHaveBeenCalledWith({
      organizationId: org.id, linkId: linkRow.id, commentId: 'c1', actorUserId: 'user-1', body: 'Edited',
    })
    updateComment.mockImplementationOnce(() => Effect.fail({ _tag: 'CommentForbidden', message: 'You can only edit your own comments' }) as never)
    const forbidden = await request('PATCH', `${commentsPath}/c1`, { body: 'Edited' })
    expect(forbidden.status).toBe(403)
    expect(await forbidden.json()).toMatchObject({ message: 'You can only edit your own comments' })
  })

  test('deleting tells the service whether the actor is an administrator', async () => {
    for (const [actor, isAdminActor] of [['viewer', false], ['member', false], ['admin', true], ['owner', true]] as const) {
      deleteComment.mockClear()
      role = actor
      expect((await request('DELETE', `${commentsPath}/c1`)).status).toBe(204)
      expect(deleteComment).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 'user-1', actorIsAdmin: isAdminActor }))
    }
    role = null
    expect((await request('DELETE', `${commentsPath}/c1`)).status).toBe(403)
  })

  test('service failures map to typed HTTP errors', async () => {
    role = 'member'
    deleteComment.mockImplementationOnce(() => Effect.fail({ _tag: 'CommentNotFound' }) as never)
    expect((await request('DELETE', `${commentsPath}/missing`)).status).toBe(404)
    deleteComment.mockImplementationOnce(() => Effect.fail({ _tag: 'CommentForbidden', message: 'nope' }) as never)
    expect((await request('DELETE', `${commentsPath}/c1`)).status).toBe(403)
    toggleCommentReaction.mockImplementationOnce(() => Effect.fail({ _tag: 'CommentInvalid', message: 'Too many reactions' }) as never)
    const invalid = await request('POST', `${commentsPath}/c1/reactions`, { emoji: '🎉' })
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toMatchObject({ message: 'Too many reactions' })
  })

  test('reactions need writer access and a valid emoji', async () => {
    role = 'viewer'
    expect((await request('POST', `${commentsPath}/c1/reactions`, { emoji: '👍' })).status).toBe(403)
    role = 'member'
    expect((await request('POST', `${commentsPath}/c1/reactions`, { emoji: '' })).status).toBe(400)
    expect((await request('POST', `${commentsPath}/c1/reactions`, { emoji: '👍' })).status).toBe(200)
    expect(toggleCommentReaction).toHaveBeenCalledTimes(1)
    expect(toggleCommentReaction).toHaveBeenCalledWith({
      organizationId: org.id, linkId: linkRow.id, commentId: 'c1', userId: 'user-1', emoji: '👍',
    })
  })
})

const keysPath = `${orgPath}/api-keys`

describe('API key management', () => {
  for (const actor of ['owner', 'admin', 'member', 'viewer', null] as const) {
    const permitted = actor === 'owner' || actor === 'admin'
    test(`${actor ?? 'non-member'} ${permitted ? 'can' : 'cannot'} manage keys`, async () => {
      role = actor
      const list = await request('GET', keysPath)
      const create = await request('POST', keysPath, { name: 'CI', role: 'member' })
      const update = await request('PATCH', `${keysPath}/key-1`, { role: 'viewer' })
      const revoke = await request('DELETE', `${keysPath}/key-1`)
      expect([list.status, create.status, update.status, revoke.status]).toEqual(
        permitted ? [200, 201, 200, 204] : [403, 403, 403, 403],
      )
      expect(createApiKey).toHaveBeenCalledTimes(permitted ? 1 : 0)
      expect(revokeApiKey).toHaveBeenCalledTimes(permitted ? 1 : 0)
    })
  }

  test('the secret is returned once on creation and never when listing', async () => {
    role = 'admin'
    const created = await (await request('POST', keysPath, { name: ' CI ', role: 'viewer' })).json()
    expect(created).toMatchObject({ secret: 'ol_live_secret-value', role: 'viewer', prefix: 'ol_live_8f3a' })
    expect(createApiKey).toHaveBeenCalledWith({ organizationId: org.id, name: 'CI', role: 'viewer', createdByUserId: 'user-1' })
    const listed = (await (await request('GET', keysPath)).json()) as { items: Record<string, unknown>[] }
    expect(JSON.stringify(listed)).not.toContain('secret')
    expect(JSON.stringify(listed)).not.toContain('keyHash')
    expect(listed.items[0]).toMatchObject({ id: 'key-1', lastUsedAt: null })
  })

  test('owner roles and blank names are rejected', async () => {
    role = 'owner'
    expect((await request('POST', keysPath, { name: 'CI', role: 'owner' })).status).toBe(400)
    expect((await request('POST', keysPath, { name: '', role: 'admin' })).status).toBe(400)
    expect((await request('POST', keysPath, { name: '   ', role: 'admin' })).status).toBe(400)
    expect((await request('PATCH', `${keysPath}/key-1`, { role: 'owner' })).status).toBe(400)
    expect(createApiKey).not.toHaveBeenCalled()
  })

  test('key lifecycle is audited, and unchanged roles are not', async () => {
    role = 'admin'
    await request('POST', keysPath, { name: 'CI', role: 'member' })
    expect(audit).toHaveBeenLastCalledWith(cookieActor, expect.objectContaining({ action: 'apikey.created' }))
    await request('PATCH', `${keysPath}/key-1`, { role: 'viewer' })
    expect(audit).toHaveBeenLastCalledWith(cookieActor, expect.objectContaining({
      action: 'apikey.role_changed', changes: [{ label: 'Role', from: 'member', to: 'viewer' }],
    }))
    audit.mockClear()
    updateApiKeyRole.mockImplementationOnce(() => Effect.succeed({ row: { ...keyRow, role: 'member' as const }, previousRole: 'member' as const }))
    await request('PATCH', `${keysPath}/key-1`, { role: 'member' })
    expect(audit).not.toHaveBeenCalled()
    await request('DELETE', `${keysPath}/key-1`)
    expect(audit).toHaveBeenLastCalledWith(cookieActor, expect.objectContaining({ action: 'apikey.revoked' }))
  })

  test('unknown keys are a 404', async () => {
    role = 'admin'
    revokeApiKey.mockImplementationOnce(() => Effect.fail({ _tag: 'ApiKeyNotFound' }) as never)
    expect((await request('DELETE', `${keysPath}/missing`)).status).toBe(404)
    updateApiKeyRole.mockImplementationOnce(() => Effect.fail({ _tag: 'ApiKeyNotFound' }) as never)
    expect((await request('PATCH', `${keysPath}/missing`, { role: 'viewer' })).status).toBe(404)
  })
})

describe('requests authenticated with an API key', () => {
  const bearer = { authorization: 'Bearer ol_live_test-secret' }
  const asKey = (keyRole: 'admin' | 'member' | 'viewer', organizationId = org.id) => {
    keyPrincipal = { id: 'key-1', organizationId, role: keyRole, name: 'CI deploy' }
  }

  test('a valid key reads its workspace without a cookie session or membership lookup', async () => {
    asKey('viewer')
    authenticated = false
    const response = await request('GET', `${orgPath}/members`, undefined, bearer)
    expect(response.status).toBe(200)
    expect(authenticateApiKey).toHaveBeenCalledWith('ol_live_test-secret')
    expect(requireSession).not.toHaveBeenCalled()
    expect(requireOrgMembership).not.toHaveBeenCalled()
  })

  test('an unknown key is a 401, even with a valid cookie session', async () => {
    keyPrincipal = null
    authenticated = true
    const response = await request('GET', `${orgPath}/members`, undefined, bearer)
    expect(response.status).toBe(401)
    expect(requireSession).not.toHaveBeenCalled()
  })

  test('a key cannot reach another workspace', async () => {
    asKey('admin', 'org-other')
    expect((await request('GET', `${orgPath}/members`, undefined, bearer)).status).toBe(403)
    expect((await request('POST', domainsPath, { hostname: 'x.example.com' }, bearer)).status).toBe(403)
    expect(registerCustomDomain).not.toHaveBeenCalled()
  })

  test('the key role limits writes', async () => {
    asKey('viewer')
    expect((await request('POST', linksPath, createBody, bearer)).status).toBe(403)
    asKey('member')
    expect((await request('POST', linksPath, createBody, bearer)).status).toBe(201)
    expect((await request('POST', domainsPath, { hostname: 'x.example.com' }, bearer)).status).toBe(403)
    asKey('admin')
    expect((await request('POST', domainsPath, { hostname: 'x.example.com' }, bearer)).status).toBe(201)
  })

  test('links created through a key have no user author, and the audit names the key', async () => {
    asKey('member')
    await request('POST', linksPath, createBody, bearer)
    expect(createLinkRecord).toHaveBeenCalledWith(expect.objectContaining({ userId: null }))
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: expect.objectContaining({ id: 'key-1', name: 'CI deploy' }) }),
      expect.objectContaining({ action: 'link.created' }),
    )
  })

  test('invites sent through a key have no user creator', async () => {
    asKey('admin')
    await request('POST', `${orgPath}/invites`, inviteBody, bearer)
    expect(createMemberInvite).toHaveBeenCalledWith(expect.objectContaining({ createdByUserId: null }))
  })

  test('a key cannot manage keys, delete or transfer the workspace, or comment', async () => {
    asKey('admin')
    expect((await request('GET', keysPath, undefined, bearer)).status).toBe(403)
    expect((await request('POST', keysPath, { name: 'escalate', role: 'admin' }, bearer)).status).toBe(403)
    expect((await request('DELETE', `${keysPath}/key-1`, undefined, bearer)).status).toBe(403)
    expect((await request('DELETE', orgPath, undefined, bearer)).status).toBe(403)
    expect((await request('POST', `${orgPath}/transfer-ownership`, { userId: 'user-2' }, bearer)).status).toBe(403)
    expect((await request('POST', commentsPath, { body: 'hi' }, bearer)).status).toBe(403)
    expect((await request('POST', `${commentsPath}/c1/reactions`, { emoji: '👍' }, bearer)).status).toBe(403)
    expect(createApiKey).not.toHaveBeenCalled()
    expect(revokeApiKey).not.toHaveBeenCalled()
    expect(deleteOrganization).not.toHaveBeenCalled()
    expect(transferOwnership).not.toHaveBeenCalled()
    expect(createComment).not.toHaveBeenCalled()
  })

  test('personal endpoints are closed to keys (a key-only request carries no session cookie)', async () => {
    asKey('admin')
    authenticated = false
    expect((await request('GET', '/organizations', undefined, bearer)).status).toBe(401)
    expect((await request('POST', '/organizations/invites/accept', { token: 'x' }, bearer)).status).toBe(401)
    expect(listOrganizationsForUser).not.toHaveBeenCalled()
    expect(acceptMemberInvite).not.toHaveBeenCalled()
  })

  test('non-OpenLink bearer tokens fall through to the cookie session', async () => {
    role = 'viewer'
    const response = await request('GET', `${orgPath}/members`, undefined, { authorization: 'Bearer something-else' })
    expect(response.status).toBe(200)
    expect(authenticateApiKey).not.toHaveBeenCalled()
    expect(requireSession).toHaveBeenCalled()
  })
})

// The real browser client against the real router: proves the two sides agree on the wire format.
describe('frontend ApiClient against the real server', () => {
  const client = ApiClient.create({
    origin: () => 'http://localhost',
    fetch: async (url, init) => {
      const result = await handleOpenApiRequest(new Request(url, init))
      if (!result.response) throw new Error(`unmatched ${url}`)
      return result.response
    },
  })
  const failure = async (promise: Promise<unknown>) => ApiError.from(await promise.then(() => null, (e) => e))

  test('parses successful, validated responses', async () => {
    role = 'viewer'
    const orgs = await client.organizations.listOrganizations()
    expect(orgs.items[0]).toMatchObject({ role: 'viewer', organization: { id: org.id } })
    const links = await client.links.listOrganizationLinks({ params: { organizationId: org.id }, query: { q: 'x', limit: '10' } })
    expect(links.total).toBe(7)
  })

  test('sends bodies and path params the server accepts', async () => {
    role = 'member'
    const folder = await client.folders.createFolder({ params: { organizationId: org.id }, body: { name: 'Docs', parentId: null } })
    expect(folder.name).toBe('Docs')
    const created = await client.links.createLink({
      params: { organizationId: org.id, domainId: domain.id },
      body: { slug: 'hello', destinationUrl: 'https://example.com/' },
    })
    expect(created.id).toBe(linkRow.id)
    await client.links.deleteLink({ params: { organizationId: org.id, domainId: domain.id, linkId: linkRow.id } })
    expect(deleteLinkRecord).toHaveBeenCalledWith(linkRow.id)
  })

  test('maps HTTP errors to ApiError with codes, statuses and server messages', async () => {
    authenticated = false
    expect(await failure(client.organizations.listOrganizations())).toMatchObject({ code: 'UNAUTHORIZED', status: 401, isUnauthorized: true })
    authenticated = true
    role = null
    expect(await failure(client.organizations.getOrganization({ params: { organizationId: org.id } }))).toMatchObject({
      code: 'FORBIDDEN', status: 403, message: 'Not a member of this organization',
    })
    role = 'owner'
    createLinkRecord.mockImplementationOnce(() => Effect.fail({ _tag: 'SlugConflict' }) as never)
    expect(await failure(client.links.createLink({
      params: { organizationId: org.id, domainId: domain.id },
      body: { slug: 'hello', destinationUrl: 'https://example.com/' },
    }))).toMatchObject({ code: 'CONFLICT', status: 409, message: 'Slug already exists on this domain', isRetryable: false })
  })

  test('input the contract rejects never reaches the network call as a success', async () => {
    role = 'owner'
    const error = await failure(client.organizations.createOrganizationInvite({
      params: { organizationId: org.id },
      body: { email: 'a@example.com', role: 'owner' as never },
    }))
    expect(error.status).toBe(400)
  })
})

describe('device sessions', () => {
  test('lists your sessions, marks this one, and never includes tokens', async () => {
    const response = await request('GET', '/me/sessions')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { items: Record<string, unknown>[] }
    expect(listDeviceSessions).toHaveBeenCalledWith('user-1')
    expect(body.items.map((i) => [i.id, i.current])).toEqual([['sess-current', true], ['sess-laptop', false]])
    expect(body.items[0]).toMatchObject({ city: 'Dhaka', latitude: 23.8, signInMethod: 'github' })
    expect(body.items[1]).not.toHaveProperty('city')
    expect(JSON.stringify(body)).not.toContain('token')
  })

  test('revokes another session for the signed-in person only', async () => {
    expect((await request('DELETE', '/me/sessions/sess-laptop')).status).toBe(204)
    expect(revokeDeviceSession).toHaveBeenCalledWith({ userId: 'user-1', sessionId: 'sess-laptop', currentSessionId: 'sess-current' })
  })

  test('maps service failures to clear HTTP errors', async () => {
    revokeDeviceSession.mockImplementationOnce(() => Effect.fail({ _tag: 'DeviceSessionNotFound' }) as never)
    expect((await request('DELETE', '/me/sessions/gone')).status).toBe(404)
    revokeDeviceSession.mockImplementationOnce(() => Effect.fail({ _tag: 'CannotRevokeCurrentSession' }) as never)
    const current = await request('DELETE', '/me/sessions/sess-current')
    expect(current.status).toBe(400)
    expect(await current.json()).toMatchObject({ message: 'Use Log out to sign out this device' })
  })

  test('signs out every other device and reports how many', async () => {
    const response = await request('POST', '/me/sessions/revoke-others')
    expect(await response.json()).toEqual({ revoked: 2 })
    expect(revokeOtherDeviceSessions).toHaveBeenCalledWith({ userId: 'user-1', currentSessionId: 'sess-current' })
  })

  test('signed-out callers and API keys cannot see or end sessions', async () => {
    authenticated = false
    for (const [method, path] of [['GET', '/me/sessions'], ['DELETE', '/me/sessions/x'], ['POST', '/me/sessions/revoke-others']] as const) {
      expect((await request(method, path)).status).toBe(401)
    }
    keyPrincipal = { id: 'key-1', organizationId: org.id, role: 'admin', name: 'CI' }
    expect((await request('POST', '/me/sessions/revoke-others', undefined, { authorization: 'Bearer ol_live_x' })).status).toBe(401)
    expect(revokeOtherDeviceSessions).not.toHaveBeenCalled()
    expect(listDeviceSessions).not.toHaveBeenCalled()
  })
})

// Bun tolerates a body on 204; Workers do not. Every no-content response must be truly empty.
describe('no-content responses', () => {
  const deletes = [
    ['DELETE', linkPath], ['DELETE', domainPath], ['DELETE', `${orgPath}/folders/folder-1`],
    ['DELETE', `${orgPath}/members/user-2`], ['DELETE', `${orgPath}/invites/invite-1`],
    ['DELETE', `${orgPath}/api-keys/key-1`], ['DELETE', orgPath], ['DELETE', '/me/sessions/sess-laptop'],
  ] as const
  for (const [method, path] of deletes) {
    test(`${method} ${path} returns 204 with no body`, async () => {
      role = 'owner'
      const response = await request(method, path)
      expect(response.status).toBe(204)
      expect(response.body).toBeNull()
      // Rebuilding with the strict Fetch rules must not throw, as it does in Workers.
      expect(() => new Response(response.body, { status: response.status })).not.toThrow()
    })
  }
})

describe('workspace links (app host by default)', () => {
  const create = (body: Record<string, unknown>) => request('POST', `${orgPath}/links`, body)

  test('a link without a domain goes on the app host', async () => {
    role = 'member'
    const response = await create({ slug: 'launch', destinationUrl: 'https://example.com/' })
    expect(response.status).toBe(201)
    expect(createLinkRecord).toHaveBeenCalledWith(expect.objectContaining({ organizationId: org.id, domainId: null, slug: 'launch' }))
    expect(getDomainInOrganization).not.toHaveBeenCalled()
  })

  test('a custom domain must belong to the workspace', async () => {
    role = 'member'
    expect((await create({ slug: 'x', destinationUrl: 'https://example.com/', domainId: domain.id })).status).toBe(201)
    expect(getDomainInOrganization).toHaveBeenCalledWith(domain.id, org.id)
    expect(createLinkRecord).toHaveBeenLastCalledWith(expect.objectContaining({ domainId: domain.id }))
    getDomainInOrganization.mockImplementationOnce(() => Effect.succeed(null as never))
    expect((await create({ slug: 'y', destinationUrl: 'https://example.com/', domainId: 'foreign' })).status).toBe(404)
  })

  test('app-host slugs cannot shadow app pages; custom domains can use them', async () => {
    role = 'member'
    for (const slug of ['login', 'Settings', 'w', 'api', 'onboarding']) {
      const response = await create({ slug, destinationUrl: 'https://example.com/' })
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ message: expect.stringContaining('reserved') })
    }
    expect(createLinkRecord).not.toHaveBeenCalled()
    expect((await create({ slug: 'login', destinationUrl: 'https://example.com/', domainId: domain.id })).status).toBe(201)
  })

  test('a taken back-half is a conflict', async () => {
    role = 'member'
    createLinkRecord.mockImplementationOnce(() => Effect.fail({ _tag: 'SlugConflict' }) as never)
    const response = await create({ slug: 'taken', destinationUrl: 'https://example.com/' })
    expect(response.status).toBe(409)
  })

  test('viewers cannot create, and get/update are scoped to the workspace', async () => {
    role = 'viewer'
    expect((await create({ slug: 'v', destinationUrl: 'https://example.com/' })).status).toBe(403)
    expect((await request('GET', `${orgPath}/links/${linkRow.id}`)).status).toBe(200)
    expect(getLinkInOrganization).toHaveBeenCalledWith(org.id, linkRow.id)
    expect((await request('PATCH', `${orgPath}/links/${linkRow.id}`, { title: 'x' })).status).toBe(403)
    role = 'member'
    expect((await request('PATCH', `${orgPath}/links/${linkRow.id}`, { title: 'New' })).status).toBe(200)
    getLinkInOrganization.mockImplementationOnce(() => Effect.succeed(null))
    expect((await request('GET', `${orgPath}/links/other`)).status).toBe(404)
  })
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
