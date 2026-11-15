import { contract } from '@openlink/contracts'
import '@orpc/effect/extensions/effect'
import { ArkTypeToJsonSchemaConverter } from '@orpc/arktype'
import { OpenAPIGenerator } from '@orpc/openapi'
import { implement } from '@orpc/server'
import { Effect } from 'effect'

import { getDomainInOrganization } from '#/server/api/access'
import {
  toActivityDto,
  toApiKeyDto,
  toCommentDto,
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
  requireOrgAdminUserEffect,
  requireOrgMemberEffect,
  requireOrgOwnerEffect,
} from '#/server/effect/access'
import { operation } from '#/server/effect/operations'
import { Bindings } from '#/server/effect/services/bindings'
import { principalUserId } from '#/server/effect/principal'
import { readSessionEffect, requireAuthSession } from '#/server/effect/session'
import type { FolderRuleViolation } from '#/server/folders/errors'
import {
  createFolder,
  deleteFolder,
  ensureFolderInOrganization,
  listFolders,
  updateFolder,
} from '#/server/folders/service'
import { createApiKey, listApiKeys, revokeApiKey, updateApiKeyRole } from '#/server/apikeys/service'
import { audit } from '#/server/activity/audit'
import { diffLink, linkUpdateAction } from '#/server/activity/actions'
import { listActivity } from '#/server/activity/service'
import type { CommentForbidden, CommentInvalid } from '#/server/comments/errors'
import { excerpt } from '#/server/comments/rules'
import {
  createComment,
  deleteComment,
  listComments,
  toggleCommentReaction,
  updateComment,
} from '#/server/comments/service'
import { runHealthChecks } from '#/server/health/checks'
import { addTagsToLinks, deleteLinks, moveLinks } from '#/server/links/bulk'
import { queryOrganizationLinks } from '#/server/links/queries'
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

const onCommentNotFound = (errors: ErrorFactories) => ({
  CommentNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'Comment not found' })),
})
const onCommentForbidden = (errors: ErrorFactories) => ({
  CommentForbidden: (error: CommentForbidden) => Effect.fail(errors.FORBIDDEN({ message: error.message })),
})
const onCommentInvalid = (errors: { BAD_REQUEST: MessageError }) => ({
  CommentInvalid: (error: CommentInvalid) => Effect.fail(errors.BAD_REQUEST({ message: error.message })),
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

  activity: {
    listActivity: os.activity.listActivity.effect(function* ({ input }) {
      const { membership } = yield* requireOrgMemberEffect(input.params.organizationId)
      const { items, nextCursor } = yield* listActivity({
        organizationId: input.params.organizationId,
        ...input.query,
      })
      const includeIp = isAdmin(membership.role)
      return { items: items.map((row) => toActivityDto(row, { includeIp })), ...(nextCursor ? { nextCursor } : {}) }
    }),
  },

  apiKeys: {
    listApiKeys: os.apiKeys.listApiKeys.effect(function* ({ input }) {
      yield* requireOrgAdminUserEffect(input.params.organizationId)
      const rows = yield* listApiKeys(input.params.organizationId)
      return { items: rows.map(toApiKeyDto) }
    }),

    createApiKey: os.apiKeys.createApiKey.effect(function* ({ input, errors }) {
      const { session } = yield* requireOrgAdminUserEffect(input.params.organizationId)
      const name = input.body.name.trim()
      if (!name) return yield* Effect.fail(errors.BAD_REQUEST({ message: 'Enter a name for the key' }))
      const { row, secret } = yield* createApiKey({
        organizationId: input.params.organizationId,
        name,
        role: input.body.role,
        createdByUserId: session.session.user.id,
      })
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'apikey.created',
        target: { type: 'api_key', id: row.id, label: row.name },
        changes: [{ label: 'Role', from: '—', to: row.role }],
      })
      return { ...toApiKeyDto(row), secret }
    }),

    updateApiKey: os.apiKeys.updateApiKey.effect(function* ({ input, errors }) {
      const { session } = yield* requireOrgAdminUserEffect(input.params.organizationId)
      const { row, previousRole } = yield* updateApiKeyRole({
        organizationId: input.params.organizationId,
        keyId: input.params.keyId,
        role: input.body.role,
      }).pipe(Effect.catchTags({ ApiKeyNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'API key not found' })) }))
      if (previousRole !== row.role) {
        yield* audit(session, {
          organizationId: input.params.organizationId,
          action: 'apikey.role_changed',
          target: { type: 'api_key', id: row.id, label: row.name },
          changes: [{ label: 'Role', from: previousRole, to: row.role }],
        })
      }
      return toApiKeyDto(row)
    }),

    revokeApiKey: os.apiKeys.revokeApiKey.effect(function* ({ input, errors }) {
      const { session } = yield* requireOrgAdminUserEffect(input.params.organizationId)
      const revoked = yield* revokeApiKey(input.params.organizationId, input.params.keyId).pipe(
        Effect.catchTags({ ApiKeyNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'API key not found' })) }),
      )
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'apikey.revoked',
        target: { type: 'api_key', id: revoked.id, label: revoked.name },
      })
      return {}
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
      yield* audit(session, {
        organizationId: org.id,
        action: 'member.joined',
        target: { type: 'member', id: session.session.user.id, label: session.session.user.name || session.session.user.email },
      })
      return toMembershipDto(org, member)
    }),

    getOrganization: os.organizations.getOrganization.effect(function* ({ input, errors }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      const org = yield* getOrganizationById(input.params.organizationId)
      if (!org) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Organization not found' }))
      return toOrganizationDto(org)
    }),

    updateOrganization: os.organizations.updateOrganization.effect(function* ({ input, errors }) {
      const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
      const before = yield* getOrganizationById(input.params.organizationId)
      const org = yield* updateOrganization({ organizationId: input.params.organizationId, ...input.body }).pipe(
        Effect.catchTags({
          OrganizationConflict: () => Effect.fail(errors.CONFLICT({ message: 'That workspace URL is already taken' })),
          BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to update workspace' })),
        }),
      )
      if (!org) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Organization not found' }))
      const changes = [
        ...(before && before.name !== org.name ? [{ label: 'Name', from: before.name, to: org.name }] : []),
        ...(before && before.slug !== org.slug ? [{ label: 'URL', from: before.slug, to: org.slug }] : []),
      ]
      if (changes.length > 0) {
        yield* audit(session, { organizationId: org.id, action: 'workspace.updated', target: { type: 'workspace', id: org.id, label: org.name }, changes })
      }
      return toOrganizationDto(org)
    }),

    deleteOrganization: os.organizations.deleteOrganization.effect(function* ({ input }) {
      yield* requireOrgOwnerEffect(input.params.organizationId)
      yield* deleteOrganization(input.params.organizationId)
      return {}
    }),

    transferOwnership: os.organizations.transferOwnership.effect(function* ({ input, errors }) {
      const { session } = yield* requireOrgOwnerEffect(input.params.organizationId)
      const newOwner = yield* transferOwnership({
        organizationId: input.params.organizationId,
        actorUserId: session.session.user.id,
        targetUserId: input.body.userId,
      }).pipe(Effect.catchTags(memberErrors(errors)))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'workspace.ownership_transferred',
        target: { type: 'member', id: newOwner.userId, label: newOwner.name },
      })
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
      const { session, membership } = yield* requireOrgAdminEffect(input.params.organizationId)
      const row = yield* updateMemberRole({
        organizationId: input.params.organizationId,
        actorRole: membership.role,
        targetUserId: input.params.userId,
        role: input.body.role,
      }).pipe(Effect.catchTags(memberErrors(errors)))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'member.role_changed',
        target: { type: 'member', id: row.userId, label: row.name },
        changes: [{ label: 'Role', from: row.previousRole ?? '—', to: row.role }],
      })
      return toWorkspaceMemberDto(row)
    }),

    removeMember: os.organizations.removeMember.effect(function* ({ input, errors }) {
      const { session, membership } = yield* requireOrgMemberEffect(input.params.organizationId)
      const actorUserId = session.session.user.id
      if (actorUserId !== input.params.userId && !isAdmin(membership.role)) {
        return yield* Effect.fail(errors.FORBIDDEN({ message: 'Admin role required' }))
      }
      const removed = yield* removeMember({
        organizationId: input.params.organizationId,
        actorUserId,
        actorRole: membership.role,
        targetUserId: input.params.userId,
      }).pipe(Effect.catchTags(memberErrors(errors)))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'member.removed',
        target: { type: 'member', id: removed.userId, label: removed.name },
      })
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
      const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
      const revoked = yield* revokeInvite(input.params.organizationId, input.params.inviteId).pipe(
        Effect.catchTags(onInviteNotFound(errors)),
      )
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'invite.revoked',
        target: { type: 'invite', id: revoked.id, label: revoked.email },
      })
      return {}
    }),

    createOrganizationInvite: os.organizations.createOrganizationInvite.effect(function* ({ input }) {
      const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
      const { invite, token } = yield* createMemberInvite({
        organizationId: input.params.organizationId,
        ...input.body,
        createdByUserId: principalUserId(session),
      })
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'member.invited',
        target: { type: 'invite', id: invite.id, label: invite.email },
        changes: [{ label: 'Role', from: '—', to: invite.role }],
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
      const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
      const row = yield* registerCustomDomain({
        organizationId: input.params.organizationId,
        hostname: input.body.hostname,
      }).pipe(Effect.catchTag('BackendError', () =>
        Effect.fail(errors.BAD_REQUEST({ message: 'Unable to register domain' })),
      ))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'domain.added',
        target: { type: 'domain', id: row.id, label: row.hostname },
      })
      return toDomainDto(row)
    }),

    getDomain: os.domains.getDomain.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      return toDomainDto(yield* requireDomain(input.params.organizationId, input.params.domainId))
    }),

    removeDomain: os.domains.removeDomain.effect(function* ({ input, errors }) {
      const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
      const domain = yield* getDomainInOrganization(input.params.domainId, input.params.organizationId)
      const removed = yield* removeCustomDomain(input.params.domainId, input.params.organizationId)
      if (!removed) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Domain not found' }))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'domain.removed',
        target: { type: 'domain', id: input.params.domainId, label: domain?.hostname ?? input.params.domainId },
      })
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
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      const row = yield* createFolder({ organizationId: input.params.organizationId, ...input.body }).pipe(
        Effect.catchTags({ ...onFolderNotFound(errors), ...onFolderRule(errors), ...onFolderNameTaken(errors) }),
      )
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'folder.created',
        target: { type: 'folder', id: row.id, label: row.name },
      })
      return toFolderDto(row)
    }),

    updateFolder: os.folders.updateFolder.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      const row = yield* updateFolder({
        organizationId: input.params.organizationId,
        folderId: input.params.folderId,
        ...input.body,
      }).pipe(Effect.catchTags({ ...onFolderNotFound(errors), ...onFolderRule(errors), ...onFolderNameTaken(errors) }))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'folder.updated',
        target: { type: 'folder', id: row.id, label: row.name },
      })
      return toFolderDto(row)
    }),

    deleteFolder: os.folders.deleteFolder.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      const deleted = yield* deleteFolder({
        organizationId: input.params.organizationId,
        folderId: input.params.folderId,
        mode: input.query.mode,
      }).pipe(Effect.catchTags(onFolderNotFound(errors)))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'folder.deleted',
        target: { type: 'folder', id: deleted.id, label: deleted.name },
        ...(input.query.mode === 'cascade' ? { changes: [{ label: 'Contents', from: 'kept', to: 'deleted' }] } : {}),
      })
      return {}
    }),
  },

  comments: {
    listLinkComments: os.comments.listLinkComments.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      const rows = yield* listComments(input.params.organizationId, input.params.linkId)
      return { items: rows.map(toCommentDto) }
    }),

    createLinkComment: os.comments.createLinkComment.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      if (session.apiKey) return yield* Effect.fail(errors.FORBIDDEN({ message: 'Comments require a signed-in member' }))
      const existing = yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      const user = session.session.user
      const row = yield* createComment({
        organizationId: input.params.organizationId,
        linkId: input.params.linkId,
        author: { id: user.id, label: user.name || user.email },
        body: input.body.body,
      }).pipe(Effect.catchTags({ ...onCommentNotFound(errors), ...onCommentInvalid(errors) }))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'link.commented',
        target: { type: 'link', id: existing.id, label: existing.title || existing.slug },
        changes: [{ label: 'Comment', from: '—', to: excerpt(row.body) }],
      })
      return toCommentDto(row)
    }),

    updateLinkComment: os.comments.updateLinkComment.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      if (session.apiKey) return yield* Effect.fail(errors.FORBIDDEN({ message: 'Comments require a signed-in member' }))
      yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      const row = yield* updateComment({
        organizationId: input.params.organizationId,
        linkId: input.params.linkId,
        commentId: input.params.commentId,
        actorUserId: session.session.user.id,
        body: input.body.body,
      }).pipe(Effect.catchTags({ ...onCommentNotFound(errors), ...onCommentForbidden(errors), ...onCommentInvalid(errors) }))
      return toCommentDto(row)
    }),

    deleteLinkComment: os.comments.deleteLinkComment.effect(function* ({ input, errors }) {
      const { session, membership } = yield* requireOrgMemberEffect(input.params.organizationId)
      yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      yield* deleteComment({
        organizationId: input.params.organizationId,
        linkId: input.params.linkId,
        commentId: input.params.commentId,
        actorUserId: session.session.user.id,
        actorIsAdmin: isAdmin(membership.role),
      }).pipe(Effect.catchTags({ ...onCommentNotFound(errors), ...onCommentForbidden(errors) }))
      return {}
    }),

    toggleCommentReaction: os.comments.toggleCommentReaction.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      if (session.apiKey) return yield* Effect.fail(errors.FORBIDDEN({ message: 'Reactions require a signed-in member' }))
      yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      const row = yield* toggleCommentReaction({
        organizationId: input.params.organizationId,
        linkId: input.params.linkId,
        commentId: input.params.commentId,
        userId: session.session.user.id,
        emoji: input.body.emoji,
      }).pipe(Effect.catchTags({ ...onCommentNotFound(errors), ...onCommentInvalid(errors) }))
      return toCommentDto(row)
    }),
  },

  links: {
    listOrganizationLinks: os.links.listOrganizationLinks.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      const { items, total } = yield* queryOrganizationLinks({
        organizationId: input.params.organizationId,
        ...input.query,
      })
      return { items: items.map(toLinkDto), total }
    }),

    moveLinks: os.links.moveLinks.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
      const affected = yield* moveLinks({ organizationId: input.params.organizationId, ...input.body })
      if (affected > 0) {
        yield* audit(session, {
          organizationId: input.params.organizationId,
          action: 'link.moved',
          target: { type: 'links', label: `${affected} link${affected === 1 ? '' : 's'}` },
        })
      }
      return { affected }
    }),

    addLinkTags: os.links.addLinkTags.effect(function* ({ input }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      const affected = yield* addTagsToLinks({ organizationId: input.params.organizationId, ...input.body })
      if (affected > 0) {
        yield* audit(session, {
          organizationId: input.params.organizationId,
          action: 'link.tagged',
          target: { type: 'links', label: `${affected} link${affected === 1 ? '' : 's'}` },
          changes: [{ label: 'Tags added', from: '—', to: input.body.tags.join(', ') }],
        })
      }
      return { affected }
    }),

    deleteLinks: os.links.deleteLinks.effect(function* ({ input }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      const affected = yield* deleteLinks({ organizationId: input.params.organizationId, ...input.body })
      if (affected > 0) {
        yield* audit(session, {
          organizationId: input.params.organizationId,
          action: 'link.deleted',
          target: { type: 'links', label: `${affected} link${affected === 1 ? '' : 's'}` },
        })
      }
      return { affected }
    }),

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
        userId: principalUserId(session),
        activateAt: input.body.activateAt ? new Date(input.body.activateAt) : undefined,
        expiresAt: input.body.expiresAt ? new Date(input.body.expiresAt) : undefined,
      }).pipe(Effect.catchTags({
        SlugConflict: () => Effect.fail(errors.CONFLICT({ message: 'Slug already exists on this domain' })),
        BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to create link' })),
      }))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'link.created',
        target: { type: 'link', id: row.id, label: row.title || row.slug },
      })
      return toLinkDto(row)
    }),

    getLink: os.links.getLink.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      return toLinkDto(yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId))
    }),

    updateLink: os.links.updateLink.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
      const existing = yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      const updated = yield* updateLinkRecord(existing, input.body)
      const changes = diffLink(existing, updated)
      if (changes.length > 0) {
        yield* audit(session, {
          organizationId: input.params.organizationId,
          action: linkUpdateAction(changes),
          target: { type: 'link', id: updated.id, label: updated.title || updated.slug },
          changes,
        })
      }
      return toLinkDto(updated)
    }),

    deleteLink: os.links.deleteLink.effect(function* ({ input }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      const existing = yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      yield* deleteLinkRecord(input.params.linkId)
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'link.deleted',
        target: { type: 'link', id: existing.id, label: existing.title || existing.slug },
      })
      return {}
    }),

    getLinkHistory: os.links.getLinkHistory.effect(function* ({ input }) {
      const { membership } = yield* requireOrgMemberEffect(input.params.organizationId)
      yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
      const { items } = yield* listActivity({
        organizationId: input.params.organizationId,
        target: { type: 'link', id: input.params.linkId },
        limit: 100,
      })
      return { items: items.map((row) => toActivityDto(row, { includeIp: isAdmin(membership.role) })) }
    }),
  },
})
