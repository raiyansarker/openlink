import { contract } from '@openlink/contracts'
import { OpenAPIGenerator } from '@orpc/openapi'
import { implement, ORPCError } from '@orpc/server'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { customDomain, link } from '@openlink/db/schema'
import { getAuth } from '#/server/auth/instance'
import { requireSession } from '#/server/auth/session'
import { getDb } from '#/server/db'
import {
  registerCustomDomain,
  refreshCustomDomain,
  removeCustomDomain,
} from '#/server/domain/service'
import { runHealthChecks } from '#/server/health/checks'
import { createLinkRecord, getLinkInDomain, listLinksForDomain } from '#/server/links/service'
import { getMembership, isAdmin } from '#/server/org/access'
import {
  acceptMemberInvite,
  createMemberInvite,
  createOrganizationWithBootstrapInvite,
  getOrganizationById,
  listOrganizationsForUser,
} from '#/server/org/service'
import {
  toDomainDto,
  toLinkDto,
  toMembershipDto,
  toOrganizationDto,
  toUserDto,
} from '#/server/api/serializers'
import type { ApiContext } from './context'
import { mergeAuthResponseCookies } from './context'
import { badRequest, conflict, forbidden, notFound, unauthorized } from './errors'

const os = implement(contract).$context<ApiContext>()

const openApiGenerator = new OpenAPIGenerator({
  schemaConverters: [new ZodToJsonSchemaConverter()],
})

export const router = os.router({
  getHealth: os.getHealth.handler(async () => {
    const report = await runHealthChecks()
    if (report.status === 'error') {
      throw new ORPCError('SERVICE_UNAVAILABLE', {
        message: 'One or more dependencies are unhealthy',
        data: report,
      })
    }
    return report
  }),

  getOpenApiDocument: os.getOpenApiDocument.handler(async () => {
    return openApiGenerator.generate(contract, {
      info: {
        title: 'OpenLink API',
        version: '0.1.0',
        description: 'OpenLink API — served via oRPC OpenAPI handler',
      },
      servers: [{ url: '/api/v1', description: 'Local and production Worker' }],
    })
  }),

  signUp: os.signUp.handler(async ({ input, context }) => {
    const response = await getAuth().api.signUpEmail({
      body: input.body,
      asResponse: true,
    })
    if (!response.ok) {
      throw conflict('Unable to create account for this email')
    }
    mergeAuthResponseCookies(context, response)
    const payload = (await response.json()) as {
      user?: { id: string; email: string; name: string; createdAt: string | Date }
    }
    if (!payload.user) throw badRequest('Sign up failed')
    return {
      user: toUserDto({
        id: payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        createdAt: new Date(payload.user.createdAt),
      }),
    }
  }),

  signIn: os.signIn.handler(async ({ input, context }) => {
    const response = await getAuth().api.signInEmail({
      body: input.body,
      asResponse: true,
    })
    if (!response.ok) throw unauthorized('Invalid email or password')
    mergeAuthResponseCookies(context, response)
    const payload = (await response.json()) as {
      user?: { id: string; email: string; name: string; createdAt: string | Date }
    }
    if (!payload.user) throw unauthorized('Invalid email or password')
    return {
      user: toUserDto({
        id: payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        createdAt: new Date(payload.user.createdAt),
      }),
    }
  }),

  signOut: os.signOut.handler(async ({ context }) => {
    const response = await getAuth().api.signOut({
      headers: context.request.headers,
      asResponse: true,
    })
    mergeAuthResponseCookies(context, response)
    return undefined
  }),

  getSession: os.getSession.handler(async ({ context }) => {
    const session = await requireSession(context.request)
    if (!session) return { authenticated: false as const, user: null }
    return { authenticated: true as const, user: session.user }
  }),

  listOrganizations: os.listOrganizations.handler(async ({ context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const rows = await listOrganizationsForUser(session.session.user.id)
    return {
      items: rows.map((row) => toMembershipDto(row.organization, row.member)),
    }
  }),

  createOrganization: os.createOrganization.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    try {
      const org = await createOrganizationWithBootstrapInvite({
        userId: session.session.user.id,
        name: input.body.name,
        slug: input.body.slug,
        inviteToken: input.body.inviteToken,
      })
      return toOrganizationDto(org)
    } catch (error) {
      if (error instanceof Error && error.message === 'invalid_bootstrap_invite') {
        throw forbidden('Invalid or expired bootstrap invite token')
      }
      throw conflict('Unable to create organization')
    }
  }),

  acceptOrganizationInvite: os.acceptOrganizationInvite.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    try {
      const { org, member } = await acceptMemberInvite({
        userId: session.session.user.id,
        token: input.body.token,
      })
      return toMembershipDto(org, member)
    } catch {
      throw badRequest('Invalid or expired invite')
    }
  }),

  getOrganization: os.getOrganization.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw notFound('Organization not found')
    const org = await getOrganizationById(input.params.organizationId)
    if (!org) throw notFound('Organization not found')
    return toOrganizationDto(org)
  }),

  createOrganizationInvite: os.createOrganizationInvite.handler(
    async ({ input, context }) => {
      const session = await requireSession(context.request)
      if (!session) throw unauthorized()
      const membership = await getMembership(
        session.session.user.id,
        input.params.organizationId,
      )
      if (!membership || !isAdmin(membership.role)) {
        throw forbidden('Admin role required')
      }
      const { invite, token } = await createMemberInvite({
        organizationId: input.params.organizationId,
        email: input.body.email,
        role: input.body.role,
        createdByUserId: session.session.user.id,
      })
      return {
        id: invite.id,
        organizationId: invite.organizationId!,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        token,
      }
    },
  ),

  listDomains: os.listDomains.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw unauthorized()
    const rows = await getDb()
      .select()
      .from(customDomain)
      .where(eq(customDomain.organizationId, input.params.organizationId))
    return { items: rows.map(toDomainDto) }
  }),

  addDomain: os.addDomain.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw forbidden()
    try {
      const row = await registerCustomDomain({
        organizationId: input.params.organizationId,
        hostname: input.body.hostname,
      })
      return toDomainDto(row)
    } catch {
      throw badRequest('Unable to register domain')
    }
  }),

  getDomain: os.getDomain.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw notFound('Domain not found')
    const [row] = await getDb()
      .select()
      .from(customDomain)
      .where(
        and(
          eq(customDomain.id, input.params.domainId),
          eq(customDomain.organizationId, input.params.organizationId),
        ),
      )
      .limit(1)
    if (!row) throw notFound('Domain not found')
    return toDomainDto(row)
  }),

  removeDomain: os.removeDomain.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership || !isAdmin(membership.role)) {
      throw forbidden('Admin role required')
    }
    const removed = await removeCustomDomain(input.params.domainId)
    if (!removed) throw notFound('Domain not found')
    return undefined
  }),

  refreshDomainStatus: os.refreshDomainStatus.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw notFound('Domain not found')
    const [row] = await getDb()
      .select()
      .from(customDomain)
      .where(
        and(
          eq(customDomain.id, input.params.domainId),
          eq(customDomain.organizationId, input.params.organizationId),
        ),
      )
      .limit(1)
    if (!row) throw notFound('Domain not found')
    const updated = await refreshCustomDomain(input.params.domainId)
    return toDomainDto(updated ?? row)
  }),

  listLinks: os.listLinks.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw unauthorized()
    const rows = await listLinksForDomain(input.params.domainId)
    return { items: rows.map(toLinkDto) }
  }),

  createLink: os.createLink.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw forbidden()
    const [domain] = await getDb()
      .select()
      .from(customDomain)
      .where(
        and(
          eq(customDomain.id, input.params.domainId),
          eq(customDomain.organizationId, input.params.organizationId),
        ),
      )
      .limit(1)
    if (!domain) throw notFound('Domain not found')
    try {
      const row = await createLinkRecord({
        organizationId: input.params.organizationId,
        domainId: input.params.domainId,
        userId: session.session.user.id,
        slug: input.body.slug,
        destinationUrl: input.body.destinationUrl,
        title: input.body.title,
        description: input.body.description,
        redirectStatus: input.body.redirectStatus,
        activateAt: input.body.activateAt ? new Date(input.body.activateAt) : undefined,
        expiresAt: input.body.expiresAt ? new Date(input.body.expiresAt) : undefined,
        maxClicks: input.body.maxClicks,
        password: input.body.password,
        expiredDestinationUrl: input.body.expiredDestinationUrl,
        fallbackDestinationUrl: input.body.fallbackDestinationUrl,
        tags: input.body.tags,
        utm: input.body.utm,
        metadata: input.body.metadata,
      })
      return toLinkDto(row)
    } catch (error) {
      if (error instanceof Error && error.message === 'slug_conflict') {
        throw conflict('Slug already exists on this domain')
      }
      throw badRequest('Unable to create link')
    }
  }),

  getLink: os.getLink.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw notFound('Link not found')
    const row = await getLinkInDomain(input.params.domainId, input.params.linkId)
    if (!row || row.organizationId !== input.params.organizationId) {
      throw notFound('Link not found')
    }
    return toLinkDto(row)
  }),

  updateLink: os.updateLink.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw forbidden()
    const existing = await getLinkInDomain(input.params.domainId, input.params.linkId)
    if (!existing || existing.organizationId !== input.params.organizationId) {
      throw notFound('Link not found')
    }
    const now = new Date()
    const passwordHash =
      input.body.clearPassword === true
        ? null
        : input.body.password
          ? createHash('sha256').update(input.body.password).digest('hex')
          : existing.passwordHash

    const [updated] = await getDb()
      .update(link)
      .set({
        destinationUrl: input.body.destinationUrl ?? existing.destinationUrl,
        title: input.body.title ?? existing.title,
        description: input.body.description ?? existing.description,
        redirectStatus: input.body.redirectStatus ?? existing.redirectStatus,
        status: input.body.status ?? existing.status,
        enabled: input.body.enabled ?? existing.enabled,
        activateAt: input.body.activateAt
          ? new Date(input.body.activateAt)
          : existing.activateAt,
        expiresAt: input.body.expiresAt
          ? new Date(input.body.expiresAt)
          : existing.expiresAt,
        maxClicks: input.body.maxClicks ?? existing.maxClicks,
        passwordHash,
        expiredDestinationUrl:
          input.body.expiredDestinationUrl ?? existing.expiredDestinationUrl,
        fallbackDestinationUrl:
          input.body.fallbackDestinationUrl ?? existing.fallbackDestinationUrl,
        tagsJson: input.body.tags ? JSON.stringify(input.body.tags) : existing.tagsJson,
        utmJson: input.body.utm ? JSON.stringify(input.body.utm) : existing.utmJson,
        metadataJson: input.body.metadata
          ? JSON.stringify(input.body.metadata)
          : existing.metadataJson,
        updatedAt: now,
      })
      .where(eq(link.id, input.params.linkId))
      .returning()

    return toLinkDto(updated!)
  }),

  deleteLink: os.deleteLink.handler(async ({ input, context }) => {
    const session = await requireSession(context.request)
    if (!session) throw unauthorized()
    const membership = await getMembership(
      session.session.user.id,
      input.params.organizationId,
    )
    if (!membership) throw forbidden()
    const existing = await getLinkInDomain(input.params.domainId, input.params.linkId)
    if (!existing || existing.organizationId !== input.params.organizationId) {
      throw notFound('Link not found')
    }
    await getDb().delete(link).where(eq(link.id, input.params.linkId))
    return undefined
  }),
})
