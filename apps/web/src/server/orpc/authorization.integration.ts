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
  id: 'link-1', organizationId: org.id, domainId: domain.id, slug: 'hello',
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
mock.module('#/server/health/checks', () => ({ runHealthChecks }))
mock.module('#/server/effect/runtime', () => ({ requestEffectContext }))

const { handleOpenApiRequest } = await import('./openapi-handler')

const sideEffects = [
  createMemberInvite, registerCustomDomain, removeCustomDomain, refreshCustomDomain,
  createLinkRecord, updateLinkRecord, deleteLinkRecord,
  acceptMemberInvite, createOrganizationWithBootstrapInvite, signIn, signUp, signOut, runHealthChecks,
]
const spies = [
  ...sideEffects, requireSession, requireOrgMembership, getDomainInOrganization,
  getOrganizationById, listOrganizationsForUser, getLinkInDomain, listLinksForDomain,
  listDomainsForOrganization,
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
