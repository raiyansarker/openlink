import { contract } from '@openlink/contracts'
import '@orpc/effect/extensions/effect'
import { ArkTypeToJsonSchemaConverter } from '@orpc/arktype'
import { OpenAPIGenerator } from '@orpc/openapi'
import { implement } from '@orpc/server'
import { Effect } from 'effect'

import { getDomainInOrganization } from '#/server/api/access'
import {
  toDomainDto,
  toLinkDto,
  toMembershipDto,
  toOrganizationDto,
  toUserDto,
} from '#/server/api/serializers'
import { signIn, signOut, signUp } from '#/server/auth/service'
import {
  listDomainsForOrganization,
  registerCustomDomain,
  refreshCustomDomain,
  removeCustomDomain,
} from '#/server/domain/service'
import {
  requireLinkWriterEffect,
  requireOrgAdminEffect,
  requireOrgMemberEffect,
} from '#/server/effect/access'
import { operation } from '#/server/effect/operations'
import { Bindings } from '#/server/effect/services/bindings'
import { readSessionEffect, requireAuthSession } from '#/server/effect/session'
import { runHealthChecks } from '#/server/health/checks'
import {
  createLinkRecord,
  deleteLinkRecord,
  getLinkInDomain,
  listLinksForDomain,
  updateLinkRecord,
} from '#/server/links/service'
import {
  acceptMemberInvite,
  createMemberInvite,
  createOrganizationWithBootstrapInvite,
  getOrganizationById,
  listOrganizationsForUser,
} from '#/server/org/service'
import type { ApiContext } from './context'
import { mergeAuthResponseCookies } from './context'
import { notFound } from './errors'

const os = implement(contract).$context<ApiContext>()
const openApiGenerator = new OpenAPIGenerator({
  converters: [new ArkTypeToJsonSchemaConverter()],
})

const requireDomain = (organizationId: string, domainId: string) =>
  Effect.gen(function* () {
    const domain = yield* getDomainInOrganization(domainId, organizationId)
    if (!domain) return yield* Effect.fail(notFound('Domain not found'))
    return domain
  })

const requireLink = (organizationId: string, domainId: string, linkId: string) =>
  Effect.gen(function* () {
    yield* requireDomain(organizationId, domainId)
    const row = yield* getLinkInDomain(domainId, linkId)
    if (!row || row.organizationId !== organizationId) {
      return yield* Effect.fail(notFound('Link not found'))
    }
    return row
  })

const readAuthPayload = (response: Response) =>
  operation('auth.readResponse', () => response.json() as Promise<{
    user?: { id: string; email: string; name: string; createdAt: string | Date }
  }>)

export const router = os.router({
  system: {
    getHealth: os.system.getHealth.effect(function* ({ errors }) {
      const report = yield* runHealthChecks()
      if (report.status === 'error') {
        return yield* Effect.fail(errors.SERVICE_UNAVAILABLE({ data: report }))
      }
      return report
    }),

    getOpenApiDocument: os.system.getOpenApiDocument.effect(function* () {
      const document = yield* operation('system.generateOpenApi', () =>
        openApiGenerator.generate(contract, {
          base: {
            info: {
              title: 'OpenLink API',
              version: '0.1.0',
              description: 'OpenLink API — served via oRPC OpenAPI handler',
            },
            servers: [{ url: '/api/v1', description: 'Local and production Worker' }],
          },
        }),
      )
      return document as unknown as { [key: string]: unknown }
    }),
  },

  auth: {
    signUp: os.auth.signUp.effect(function* ({ input, context, errors }) {
      const response = yield* signUp(input.body)
      if (!response.ok) {
        return yield* Effect.fail(errors.CONFLICT({ message: 'Unable to create account for this email' }))
      }
      mergeAuthResponseCookies(context, response)
      const payload = yield* readAuthPayload(response)
      if (!payload.user) return yield* Effect.fail(errors.BAD_REQUEST({ message: 'Sign up failed' }))
      return { user: toUserDto({ ...payload.user, createdAt: new Date(payload.user.createdAt) }) }
    }),

    signIn: os.auth.signIn.effect(function* ({ input, context, errors }) {
      const response = yield* signIn(input.body)
      if (!response.ok) {
        return yield* Effect.fail(errors.UNAUTHORIZED({ message: 'Invalid email or password' }))
      }
      mergeAuthResponseCookies(context, response)
      const payload = yield* readAuthPayload(response)
      if (!payload.user) {
        return yield* Effect.fail(errors.UNAUTHORIZED({ message: 'Invalid email or password' }))
      }
      return { user: toUserDto({ ...payload.user, createdAt: new Date(payload.user.createdAt) }) }
    }),

    signOut: os.auth.signOut.effect(function* ({ context }) {
      const response = yield* signOut(context.request)
      mergeAuthResponseCookies(context, response)
      return {}
    }),

    getSession: os.auth.getSession.effect(function* () {
      const session = yield* readSessionEffect
      return session
        ? { authenticated: true as const, user: session.user }
        : { authenticated: false as const }
    }),
  },

  organizations: {
    listOrganizations: os.organizations.listOrganizations.effect(function* () {
      const session = yield* requireAuthSession
      const rows = yield* listOrganizationsForUser(session.session.user.id)
      return { items: rows.map((row) => toMembershipDto(row.organization, row.member)) }
    }),

    createOrganization: os.organizations.createOrganization.effect(function* ({ input, errors }) {
      const session = yield* requireAuthSession
      const org = yield* createOrganizationWithBootstrapInvite({
        userId: session.session.user.id,
        ...input.body,
      }).pipe(Effect.catchTags({
        InvalidBootstrapInvite: () => Effect.fail(errors.FORBIDDEN({ message: 'Invalid or expired bootstrap invite token' })),
        OrganizationConflict: () => Effect.fail(errors.CONFLICT({ message: 'Unable to create organization' })),
        BackendError: () => Effect.fail(errors.CONFLICT({ message: 'Unable to create organization' })),
      }))
      return toOrganizationDto(org)
    }),

    acceptOrganizationInvite: os.organizations.acceptOrganizationInvite.effect(function* ({ input, errors }) {
      const session = yield* requireAuthSession
      const { org, member } = yield* acceptMemberInvite({
        userId: session.session.user.id,
        userEmail: session.session.user.email,
        token: input.body.token,
      }).pipe(Effect.catchTags({
        InviteEmailMismatch: () => Effect.fail(errors.FORBIDDEN({ message: 'This invite was sent to a different email address' })),
        InvalidInvite: () => Effect.fail(errors.BAD_REQUEST({ message: 'Invalid or expired invite' })),
        BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Invalid or expired invite' })),
      }))
      return toMembershipDto(org, member)
    }),

    getOrganization: os.organizations.getOrganization.effect(function* ({ input, errors }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      const org = yield* getOrganizationById(input.params.organizationId)
      if (!org) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Organization not found' }))
      return toOrganizationDto(org)
    }),

    createOrganizationInvite: os.organizations.createOrganizationInvite.effect(function* ({ input }) {
      const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
      const { invite, token } = yield* createMemberInvite({
        organizationId: input.params.organizationId,
        ...input.body,
        createdByUserId: session.session.user.id,
      })
      const bindings = yield* Bindings
      return {
        id: invite.id,
        organizationId: invite.organizationId!,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        ...(bindings.EXPOSE_INVITE_TOKENS_IN_API === 'true' ? { token } : {}),
      }
    }),
  },

  domains: {
    listDomains: os.domains.listDomains.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      const rows = yield* listDomainsForOrganization(input.params.organizationId)
      return { items: rows.map(toDomainDto) }
    }),

    addDomain: os.domains.addDomain.effect(function* ({ input, errors }) {
      yield* requireOrgAdminEffect(input.params.organizationId)
      const row = yield* registerCustomDomain({
        organizationId: input.params.organizationId,
        hostname: input.body.hostname,
      }).pipe(Effect.catchTag('BackendError', () =>
        Effect.fail(errors.BAD_REQUEST({ message: 'Unable to register domain' })),
      ))
      return toDomainDto(row)
    }),

    getDomain: os.domains.getDomain.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      return toDomainDto(yield* requireDomain(input.params.organizationId, input.params.domainId))
    }),

    removeDomain: os.domains.removeDomain.effect(function* ({ input, errors }) {
      yield* requireOrgAdminEffect(input.params.organizationId)
      const removed = yield* removeCustomDomain(input.params.domainId, input.params.organizationId)
      if (!removed) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Domain not found' }))
      return {}
    }),

    refreshDomainStatus: os.domains.refreshDomainStatus.effect(function* ({ input }) {
      yield* requireOrgAdminEffect(input.params.organizationId)
      const row = yield* requireDomain(input.params.organizationId, input.params.domainId)
      const updated = yield* refreshCustomDomain(input.params.domainId)
      return toDomainDto(updated ?? row)
    }),
  },

  links: {
    listLinks: os.links.listLinks.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      yield* requireDomain(input.params.organizationId, input.params.domainId)
      const rows = yield* listLinksForDomain(input.params.domainId)
      return { items: rows.map(toLinkDto) }
    }),

    createLink: os.links.createLink.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      yield* requireDomain(input.params.organizationId, input.params.domainId)
      const row = yield* createLinkRecord({
        ...input.body,
        organizationId: input.params.organizationId,
        domainId: input.params.domainId,
        userId: session.session.user.id,
        activateAt: input.body.activateAt ? new Date(input.body.activateAt) : undefined,
        expiresAt: input.body.expiresAt ? new Date(input.body.expiresAt) : undefined,
      }).pipe(Effect.catchTags({
        SlugConflict: () => Effect.fail(errors.CONFLICT({ message: 'Slug already exists on this domain' })),
        BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to create link' })),
      }))
      return toLinkDto(row)
    }),

    getLink: os.links.getLink.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      return toLinkDto(yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId))
    }),

    updateLink: os.links.updateLink.effect(function* ({ input }) {
      yield* requireLinkWriterEffect(input.params.organizationId)
      const existing = yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      return toLinkDto(yield* updateLinkRecord(existing, input.body))
    }),

    deleteLink: os.links.deleteLink.effect(function* ({ input }) {
      yield* requireLinkWriterEffect(input.params.organizationId)
      yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      yield* deleteLinkRecord(input.params.linkId)
      return {}
    }),
  },
})
