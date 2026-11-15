import { contract } from '@openlink/contracts'
import '@orpc/effect/extensions/effect'
import { ArkTypeToJsonSchemaConverter } from '@orpc/arktype'
import { OpenAPIGenerator } from '@orpc/openapi'
import { implement } from '@orpc/server'
import { Effect } from 'effect'

import { getDomainInOrganization } from '#/server/api/access'
import {
  toDomainDto,
  toFolderDto,
  toLinkDto,
  toMembershipDto,
  toOrganizationDto,
  toPendingInviteDto,
  toUserDto,
  toWorkspaceMemberDto,
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
  requireOrgOwnerEffect,
} from '#/server/effect/access'
import { operation } from '#/server/effect/operations'
import { Bindings } from '#/server/effect/services/bindings'
import { readSessionEffect, requireAuthSession } from '#/server/effect/session'
import type { FolderRuleViolation } from '#/server/folders/errors'
import {
  createFolder,
  deleteFolder,
  ensureFolderInOrganization,
  listFolders,
  updateFolder,
} from '#/server/folders/service'
import { runHealthChecks } from '#/server/health/checks'
import {
  createLinkRecord,
  deleteLinkRecord,
  getLinkInDomain,
  listLinksForDomain,
  updateLinkRecord,
} from '#/server/links/service'
import type { MemberPermissionDenied } from '#/server/org/errors'
import {
  deleteOrganization,
  listMembers,
  listPendingInvites,
  removeMember,
  resendInvite,
  revokeInvite,
  transferOwnership,
  updateMemberRole,
  updateOrganization,
} from '#/server/org/members'
import {
  acceptMemberInvite,
  createMemberInvite,
  createOrganizationWithBootstrapInvite,
  getOrganizationById,
  listOrganizationsForUser,
} from '#/server/org/service'
import type { ApiContext } from './context'
import { mergeAuthResponseCookies } from './context'
import { isAdmin } from '#/server/org/permissions'
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

type MessageError = (options: { message: string }) => Error
type ErrorFactories = { NOT_FOUND: MessageError; FORBIDDEN: MessageError }

/** Map member-domain failures onto the typed API errors; spread only the ones an effect can raise. */
const onMemberNotFound = (errors: ErrorFactories) => ({
  MemberNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'Member not found' })),
})
const onInviteNotFound = (errors: ErrorFactories) => ({
  InviteNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'Invite not found' })),
})
const onMemberDenied = (errors: ErrorFactories) => ({
  MemberPermissionDenied: (error: MemberPermissionDenied) =>
    Effect.fail(errors.FORBIDDEN({ message: error.reason })),
})
const memberErrors = (errors: ErrorFactories) => ({
  ...onMemberNotFound(errors),
  ...onMemberDenied(errors),
})

const onFolderNotFound = (errors: ErrorFactories) => ({
  FolderNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'Folder not found' })),
})
const onFolderRule = (errors: { BAD_REQUEST: MessageError }) => ({
  FolderRuleViolation: (error: FolderRuleViolation) => Effect.fail(errors.BAD_REQUEST({ message: error.message })),
})
const onFolderNameTaken = (errors: { CONFLICT: MessageError }) => ({
  FolderNameTaken: () => Effect.fail(errors.CONFLICT({ message: 'A folder with this name already exists here' })),
})

/** A link may only be filed into a folder of its own workspace. */
const requireLinkFolder = (
  organizationId: string,
  folderId: string | null | undefined,
  errors: { BAD_REQUEST: MessageError },
) =>
  folderId
    ? ensureFolderInOrganization(organizationId, folderId).pipe(
        Effect.catchTags({ FolderNotFound: () => Effect.fail(errors.BAD_REQUEST({ message: 'Folder not found' })) }),
      )
    : Effect.void

type AuthPayload = {
  user?: { id: string; email: string; name: string; createdAt: string | Date }
}

const readAuthPayload = (response: Response) =>
  operation<AuthPayload>('auth.readResponse', () => response.json())

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

    updateOrganization: os.organizations.updateOrganization.effect(function* ({ input, errors }) {
      yield* requireOrgAdminEffect(input.params.organizationId)
      const org = yield* updateOrganization({ organizationId: input.params.organizationId, ...input.body }).pipe(
        Effect.catchTags({
          OrganizationConflict: () => Effect.fail(errors.CONFLICT({ message: 'That workspace URL is already taken' })),
          BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to update workspace' })),
        }),
      )
      if (!org) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Organization not found' }))
      return toOrganizationDto(org)
    }),

    deleteOrganization: os.organizations.deleteOrganization.effect(function* ({ input }) {
      yield* requireOrgOwnerEffect(input.params.organizationId)
      yield* deleteOrganization(input.params.organizationId)
      return {}
    }),

    transferOwnership: os.organizations.transferOwnership.effect(function* ({ input, errors }) {
      const { session } = yield* requireOrgOwnerEffect(input.params.organizationId)
      yield* transferOwnership({
        organizationId: input.params.organizationId,
        actorUserId: session.session.user.id,
        targetUserId: input.body.userId,
      }).pipe(Effect.catchTags(memberErrors(errors)))
      const org = yield* getOrganizationById(input.params.organizationId)
      if (!org) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Organization not found' }))
      return toOrganizationDto(org)
    }),

    listMembers: os.organizations.listMembers.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      const rows = yield* listMembers(input.params.organizationId)
      return { items: rows.map(toWorkspaceMemberDto) }
    }),

    updateMemberRole: os.organizations.updateMemberRole.effect(function* ({ input, errors }) {
      const { membership } = yield* requireOrgAdminEffect(input.params.organizationId)
      const row = yield* updateMemberRole({
        organizationId: input.params.organizationId,
        actorRole: membership.role,
        targetUserId: input.params.userId,
        role: input.body.role,
      }).pipe(Effect.catchTags(memberErrors(errors)))
      return toWorkspaceMemberDto(row)
    }),

    removeMember: os.organizations.removeMember.effect(function* ({ input, errors }) {
      const { session, membership } = yield* requireOrgMemberEffect(input.params.organizationId)
      const actorUserId = session.session.user.id
      if (actorUserId !== input.params.userId && !isAdmin(membership.role)) {
        return yield* Effect.fail(errors.FORBIDDEN({ message: 'Admin role required' }))
      }
      yield* removeMember({
        organizationId: input.params.organizationId,
        actorUserId,
        actorRole: membership.role,
        targetUserId: input.params.userId,
      }).pipe(Effect.catchTags(memberErrors(errors)))
      return {}
    }),

    listOrganizationInvites: os.organizations.listOrganizationInvites.effect(function* ({ input }) {
      yield* requireOrgAdminEffect(input.params.organizationId)
      const rows = yield* listPendingInvites(input.params.organizationId)
      return { items: rows.map(toPendingInviteDto) }
    }),

    resendOrganizationInvite: os.organizations.resendOrganizationInvite.effect(function* ({ input, errors }) {
      yield* requireOrgAdminEffect(input.params.organizationId)
      const { invite, token } = yield* resendInvite(input.params.organizationId, input.params.inviteId).pipe(
        Effect.catchTags(onInviteNotFound(errors)),
      )
      const bindings = yield* Bindings
      return {
        ...toPendingInviteDto(invite),
        ...(bindings.EXPOSE_INVITE_TOKENS_IN_API === 'true' ? { token } : {}),
      }
    }),

    revokeOrganizationInvite: os.organizations.revokeOrganizationInvite.effect(function* ({ input, errors }) {
      yield* requireOrgAdminEffect(input.params.organizationId)
      yield* revokeInvite(input.params.organizationId, input.params.inviteId).pipe(
        Effect.catchTags(onInviteNotFound(errors)),
      )
      return {}
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

  folders: {
    listFolders: os.folders.listFolders.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      const rows = yield* listFolders(input.params.organizationId)
      return { items: rows.map(toFolderDto) }
    }),

    createFolder: os.folders.createFolder.effect(function* ({ input, errors }) {
      yield* requireLinkWriterEffect(input.params.organizationId)
      const row = yield* createFolder({ organizationId: input.params.organizationId, ...input.body }).pipe(
        Effect.catchTags({ ...onFolderNotFound(errors), ...onFolderRule(errors), ...onFolderNameTaken(errors) }),
      )
      return toFolderDto(row)
    }),

    updateFolder: os.folders.updateFolder.effect(function* ({ input, errors }) {
      yield* requireLinkWriterEffect(input.params.organizationId)
      const row = yield* updateFolder({
        organizationId: input.params.organizationId,
        folderId: input.params.folderId,
        ...input.body,
      }).pipe(Effect.catchTags({ ...onFolderNotFound(errors), ...onFolderRule(errors), ...onFolderNameTaken(errors) }))
      return toFolderDto(row)
    }),

    deleteFolder: os.folders.deleteFolder.effect(function* ({ input, errors }) {
      yield* requireLinkWriterEffect(input.params.organizationId)
      yield* deleteFolder({
        organizationId: input.params.organizationId,
        folderId: input.params.folderId,
        mode: input.query.mode,
      }).pipe(Effect.catchTags(onFolderNotFound(errors)))
      return {}
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
      yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
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

    updateLink: os.links.updateLink.effect(function* ({ input, errors }) {
      yield* requireLinkWriterEffect(input.params.organizationId)
      yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
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
