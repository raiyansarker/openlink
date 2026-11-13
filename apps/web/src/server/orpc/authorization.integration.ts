// @ts-ignore -- Bun provides this API at runtime; the web app has no Bun test typings.
import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { customDomain, link } from '@openlink/db/schema'
import { Context } from 'effect'
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
  id: 'link-1', organizationId: org.id, domainId: domain.id, slug: 'hello',
  alias: null, title: null, description: null, destinationUrl: 'https://example.com/',
  redirectStatus: 302, status: 'active', enabled: true, activateAt: null,
  expiresAt: null, maxClicks: null, clickCount: 0, passwordHash: null,
  expiredDestinationUrl: null, fallbackDestinationUrl: null, tagsJson: '[]',
  utmJson: null, metadataJson: null, createdByUserId: 'user-1', createdAt: now, updatedAt: now,
}
let role: OrganizationRole | null = 'viewer'

const requireSession = mock(async () => ({ session: { user: { id: 'user-1' } } }))
const requireOrgMembership = mock(async (_userId: string, _organizationId: string) =>
  role === null ? null : { role },
)
const getDomainInOrganization = mock(async (_domainId: string, _organizationId: string) => domain)
const getOrganizationById = mock(async (_organizationId: string) => org)
const listOrganizationsForUser = mock(async (_userId: string) => [{ organization: org, member: { role, joinedAt: now } }])
const createMemberInvite = mock(async (input: { organizationId: string; email: string; role: string; createdByUserId: string }) => ({
  invite: { id: 'invite-1', ...input, expiresAt: now }, token: 'invite-token',
}))
const registerCustomDomain = mock(async (_input: unknown) => domain)
const removeCustomDomain = mock(async (_domainId: string, _organizationId: string) => true)
const refreshCustomDomain = mock(async (_domainId: string) => domain)
const createLinkRecord = mock(async (_input: unknown) => linkRow)
const getLinkInDomain = mock(async (_domainId: string, _linkId: string) => linkRow)
const listLinksForDomain = mock(async (_domainId: string) => [linkRow])
const hashLinkPassword = mock(async (_password: string) => 'hashed-password')
const selectWhere = mock(async (_condition: unknown) => [domain])
const select = mock(() => ({ from: () => ({ where: selectWhere }) }))
const updateSet = mock((values: Partial<typeof linkRow>) => ({
  where: (_condition: unknown) => ({ returning: async () => [{ ...linkRow, ...values }] }),
}))
const update = mock((_table: unknown) => ({ set: updateSet }))
const deleteWhere = mock(async (_condition: unknown) => undefined)
const deleteRow = mock((_table: unknown) => ({ where: deleteWhere }))
const unexpectedWrite = mock(() => { throw new Error('Unexpected write') })
const getDb = mock(() => ({ select, update, delete: deleteRow, insert: unexpectedWrite }))
const getBindings = mock(() => ({ EXPOSE_INVITE_TOKENS_IN_API: 'false' }))
const getAuth = mock(() => { throw new Error('Unexpected auth provider call') })
const runHealthChecks = mock(() => { throw new Error('Unexpected health check') })
const getRequestEffectContext = mock(async () => Context.empty())

mock.module('#/server/env', () => ({ getBindings }))
mock.module('#/server/db', () => ({ getDb }))
mock.module('#/server/auth/session', () => ({ requireSession }))
mock.module('#/server/auth/instance', () => ({ getAuth }))
mock.module('#/server/api/access', () => ({ requireOrgMembership, getDomainInOrganization }))
mock.module('#/server/domain/service', () => ({ registerCustomDomain, removeCustomDomain, refreshCustomDomain }))
mock.module('#/server/links/service', () => ({ createLinkRecord, getLinkInDomain, listLinksForDomain }))
mock.module('#/server/links/password', () => ({ hashLinkPassword }))
mock.module('#/server/org/service', () => ({
  createMemberInvite, getOrganizationById, listOrganizationsForUser,
  acceptMemberInvite: unexpectedWrite, createOrganizationWithBootstrapInvite: unexpectedWrite,
}))
mock.module('#/server/health/checks', () => ({ runHealthChecks }))
mock.module('#/server/effect/runtime', () => ({ getRequestEffectContext }))

const { handleOpenApiRequest } = await import('./openapi-handler')

const sideEffects = [
  createMemberInvite, registerCustomDomain, removeCustomDomain, refreshCustomDomain,
  createLinkRecord, update, updateSet, deleteRow, deleteWhere, hashLinkPassword,
  unexpectedWrite, getAuth, runHealthChecks,
]
const spies = [
  ...sideEffects, requireSession, requireOrgMembership, getDomainInOrganization,
  getOrganizationById, listOrganizationsForUser, getLinkInDomain, listLinksForDomain,
  select, selectWhere, getDb, getBindings, getRequestEffectContext,
]
beforeEach(() => {
  role = 'viewer'
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
    status: 200, allowed: ['owner', 'admin', 'member'], effects: [update, updateSet, hashLinkPassword],
    assertWrite: () => {
      expect(hashLinkPassword).toHaveBeenCalledWith(updateBody.password)
      expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({ title: updateBody.title, passwordHash: 'hashed-password' }))
    },
    response: { id: linkRow.id, title: updateBody.title, passwordProtected: true },
  },
  {
    name: 'delete link', method: 'DELETE', path: linkPath, body: undefined,
    status: 204, allowed: ['owner', 'admin', 'member'], effects: [deleteRow, deleteWhere],
    assertWrite: () => expect(deleteWhere).toHaveBeenCalledTimes(1),
    response: undefined,
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
          expect(getDb).not.toHaveBeenCalled()
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
    expect(getDb).not.toHaveBeenCalled()
    expectNoSideEffects()
  })
}

const reads = [
  { name: 'list organizations', path: '/organizations', expected: { items: [{ role: 'viewer', organization: { id: org.id } }] }, read: listOrganizationsForUser, args: ['user-1'] },
  { name: 'get organization', path: orgPath, expected: { id: org.id }, read: getOrganizationById, args: [org.id] },
  { name: 'list domains', path: domainsPath, expected: { items: [{ id: domain.id }] }, read: select, args: [] },
  { name: 'get domain', path: domainPath, expected: { id: domain.id }, read: getDomainInOrganization, args: [domain.id, org.id] },
  { name: 'list links', path: linksPath, expected: { items: [{ id: linkRow.id }] }, read: listLinksForDomain, args: [domain.id] },
  { name: 'get link', path: linkPath, expected: { id: linkRow.id }, read: getLinkInDomain, args: [domain.id, linkRow.id] },
] as const
for (const endpoint of reads) {
  test(`viewer can ${endpoint.name}`, async () => {
    const response = await request('GET', endpoint.path)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject(endpoint.expected)
    expect(endpoint.read).toHaveBeenCalledWith(...endpoint.args)
    if (endpoint.path !== '/organizations') {
      expect(requireOrgMembership).toHaveBeenCalledWith('user-1', org.id)
    }
    expectNoSideEffects()
  })
}
