import { FrameCheck } from '#/server/redirect/frame-check'
import { AnalyticsReports, AnalyticsSummaries, RecentClicks } from '#/server/analytics/report'
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
  toDeviceSessionDto,
  toDomainDto,
  toFolderDto,
  toLinkDto,
  toMembershipDto,
  toOrganizationDto,
  toPendingInviteDto,
  toMyInviteDto,
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
import { LinkHistory, type LinkHistoryKind } from '#/server/activity/link-history'
import { DomainLinks } from '#/server/domain/domain-links'
import { DeviceSessions } from '#/server/devices/sessions'
import { MediaStore } from '#/server/media/media-store'
import { ReservedSlugs } from '@openlink/contracts'
import { runHealthChecks } from '#/server/health/checks'
import { addTagsToLinks, deleteLinks, moveLinks } from '#/server/links/bulk'
import { queryOrganizationLinks } from '#/server/links/queries'
import {
  createLinkRecord,
  deleteLinkRecord,
  getLinkInDomain,
  getLinkInOrganization,
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
  acceptInviteById,
  declineInviteForEmail,
  listInvitesForEmail,
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

/** A link addressed by workspace and link id, optionally pinned to a domain. */
type LinkAddress = { organizationId: string; linkId: string; domainId?: string }

/**
 * A link's history. Served at both the per-domain paths and
 * the workspace paths (which also reach links on the app's own host).
 */
class LinkHistoryRoutes {
  static locate(address: LinkAddress) {
    return Effect.gen(function* () {
      if (address.domainId) return yield* requireLink(address.organizationId, address.domainId, address.linkId)
      const row = yield* getLinkInOrganization(address.organizationId, address.linkId)
      if (!row) return yield* Effect.fail(notFound('Link not found'))
      return row
    })
  }

  static history(address: LinkAddress, query: { kind?: LinkHistoryKind; limit?: number; cursor?: string }) {
    return Effect.gen(function* () {
      const { membership } = yield* requireOrgMemberEffect(address.organizationId)
      yield* LinkHistoryRoutes.locate(address)
      const { items, nextCursor } = yield* LinkHistory.page({ organizationId: address.organizationId, linkId: address.linkId, ...query })
      // Totals only with the first page; later pages don't change them.
      const summary = query.cursor ? undefined : yield* LinkHistory.summary(address.organizationId, address.linkId)
      return {
        items: items.map((row) => toActivityDto(row, { includeIp: isAdmin(membership.role) })),
        ...(nextCursor ? { nextCursor } : {}),
        ...(summary ? { summary } : {}),
      }
    })
  }
}

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

  analytics: {
    getAnalyticsReport: os.analytics.getAnalyticsReport.effect(function* ({ input }) {
      const organizationId = input.params.organizationId
      yield* requireOrgMemberEffect(organizationId)
      const { linkId, range = '30d', tzOffset = 0 } = input.query
      // A link outside this workspace must not reveal whether it exists.
      if (linkId && !(yield* getLinkInOrganization(organizationId, linkId))) return yield* Effect.fail(notFound('Link not found'))
      return yield* AnalyticsReports.build({ organizationId, ...(linkId ? { linkId } : {}) }, range, tzOffset)
    }),

    listRecentClicks: os.analytics.listRecentClicks.effect(function* ({ input }) {
      const organizationId = input.params.organizationId
      yield* requireOrgMemberEffect(organizationId)
      const { linkId, limit } = input.query
      if (linkId && !(yield* getLinkInOrganization(organizationId, linkId))) return yield* Effect.fail(notFound('Link not found'))
      return yield* RecentClicks.list({ organizationId, ...(linkId ? { linkId } : {}) }, limit)
    }),

    getAnalyticsSummary: os.analytics.getAnalyticsSummary.effect(function* ({ input }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      return yield* AnalyticsSummaries.build(input.params.organizationId, input.query.tzOffset ?? 0)
    }),
  },

  account: {
    // Cookie sessions only: an API key is not a device and must not sign people out.
    listDeviceSessions: os.account.listDeviceSessions.effect(function* () {
      const session = yield* requireAuthSession
      const currentId = session.session.session.id
      const rows = yield* DeviceSessions.list(session.session.user.id)
      return { items: rows.map((row) => toDeviceSessionDto(row, currentId)) }
    }),

    revokeDeviceSession: os.account.revokeDeviceSession.effect(function* ({ input, errors }) {
      const session = yield* requireAuthSession
      yield* DeviceSessions.revoke({
        userId: session.session.user.id,
        sessionId: input.params.sessionId,
        currentSessionId: session.session.session.id,
      }).pipe(
        Effect.catchTags({
          DeviceSessionNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'That device is already signed out' })),
          CannotRevokeCurrentSession: () => Effect.fail(errors.BAD_REQUEST({ message: 'Use Log out to sign out this device' })),
        }),
      )
      return {}
    }),

    revokeOtherDeviceSessions: os.account.revokeOtherDeviceSessions.effect(function* () {
      const session = yield* requireAuthSession
      const revoked = yield* DeviceSessions.revokeOthers({
        userId: session.session.user.id,
        currentSessionId: session.session.session.id,
      })
      return { revoked }
    }),

    // Invites addressed to you. Matched on your signed-in email, so only you can see or answer them.
    listMyInvites: os.account.listMyInvites.effect(function* () {
      const session = yield* requireAuthSession
      const rows = yield* listInvitesForEmail(session.session.user.email)
      return { items: rows.map(toMyInviteDto) }
    }),

    acceptMyInvite: os.account.acceptMyInvite.effect(function* ({ input, errors }) {
      const session = yield* requireAuthSession
      const { org, member } = yield* acceptInviteById({
        inviteId: input.params.inviteId,
        userId: session.session.user.id,
        userEmail: session.session.user.email,
      }).pipe(Effect.catchTags({
        // Not yours, gone or expired: all look the same, so ids can't be probed.
        InviteEmailMismatch: () => Effect.fail(errors.NOT_FOUND({ message: 'This invite is no longer available' })),
        InvalidInvite: () => Effect.fail(errors.NOT_FOUND({ message: 'This invite is no longer available' })),
      }))
      yield* audit(session, {
        organizationId: org.id,
        action: 'member.joined',
        target: { type: 'member', id: session.session.user.id, label: session.session.user.name || session.session.user.email },
      })
      return toMembershipDto(org, member)
    }),

    declineMyInvite: os.account.declineMyInvite.effect(function* ({ input, errors }) {
      const session = yield* requireAuthSession
      const declined = yield* declineInviteForEmail({ inviteId: input.params.inviteId, userEmail: session.session.user.email }).pipe(
        Effect.catchTags({ InvalidInvite: () => Effect.fail(errors.NOT_FOUND({ message: 'This invite is no longer available' })) }),
      )
      yield* audit(session, {
        organizationId: declined.organizationId,
        action: 'invite.declined',
        target: { type: 'invite', id: declined.id, label: declined.email },
      })
      return {}
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
        userId: session.session.user.id,
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
      const existing = yield* getOrganizationById(input.params.organizationId)
      yield* deleteOrganization(input.params.organizationId)
      yield* MediaStore.removeQuietly(existing?.logoKey)
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
      const counts = yield* DomainLinks.counts(input.params.organizationId)
      return { items: rows.map((row) => toDomainDto(row, counts.get(row.id) ?? 0)) }
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
      const row = yield* requireDomain(input.params.organizationId, input.params.domainId)
      return toDomainDto(row, yield* DomainLinks.countFor(input.params.organizationId, row.id))
    }),

    removeDomain: os.domains.removeDomain.effect(function* ({ input, errors }) {
      const { organizationId, domainId } = input.params
      const { session } = yield* requireOrgAdminEffect(organizationId)
      const domain = yield* requireDomain(organizationId, domainId)
      // Its links are deleted with it (the foreign key cascades); the log keeps how many.
      const linkCount = yield* DomainLinks.countFor(organizationId, domainId)
      const removed = yield* removeCustomDomain(domainId, organizationId)
      if (!removed) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Domain not found' }))
      yield* audit(session, {
        organizationId,
        action: 'domain.removed',
        target: { type: 'domain', id: domainId, label: domain.hostname },
        ...(linkCount > 0 ? { changes: [{ label: 'Links deleted', from: String(linkCount), to: '0' }] } : {}),
      })
      return {}
    }),

    refreshDomainStatus: os.domains.refreshDomainStatus.effect(function* ({ input }) {
      yield* requireOrgAdminEffect(input.params.organizationId)
      const row = yield* requireDomain(input.params.organizationId, input.params.domainId)
      const updated = yield* refreshCustomDomain(input.params.domainId)
      return toDomainDto(updated ?? row, yield* DomainLinks.countFor(input.params.organizationId, row.id))
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

    checkFraming: os.links.checkFraming.effect(function* ({ input }) {
      // Only people who can edit links can make the server fetch a URL.
      yield* requireLinkWriterEffect(input.params.organizationId)
      return { frameable: yield* FrameCheck.frameable(input.body.url) }
    }),

    createWorkspaceLink: os.links.createWorkspaceLink.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      const domainId = input.body.domainId ?? null
      if (domainId) yield* requireDomain(input.params.organizationId, domainId)
      // On the app host, a slug must not shadow an app page.
      if (!domainId && input.body.slug && ReservedSlugs.isReserved(input.body.slug)) {
        return yield* Effect.fail(errors.BAD_REQUEST({ message: `“${input.body.slug}” is reserved. Choose another back-half.` }))
      }
      yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
      const { domainId: _ignored, ...body } = input.body
      const row = yield* createLinkRecord({
        ...body,
        organizationId: input.params.organizationId,
        domainId,
        userId: principalUserId(session),
        activateAt: body.activateAt ? new Date(body.activateAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      }).pipe(Effect.catchTags({
        SlugConflict: () => Effect.fail(errors.CONFLICT({ message: 'That back-half is already taken' })),
        BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to create link' })),
      }))
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'link.created',
        target: { type: 'link', id: row.id, label: row.title || row.slug },
      })
      return toLinkDto(row)
    }),

    getWorkspaceLink: os.links.getWorkspaceLink.effect(function* ({ input, errors }) {
      yield* requireOrgMemberEffect(input.params.organizationId)
      const row = yield* getLinkInOrganization(input.params.organizationId, input.params.linkId)
      if (!row) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Link not found' }))
      return toLinkDto(row)
    }),

    updateWorkspaceLink: os.links.updateWorkspaceLink.effect(function* ({ input, errors }) {
      const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
      yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
      const existing = yield* getLinkInOrganization(input.params.organizationId, input.params.linkId)
      if (!existing) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Link not found' }))
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
      const { domainId: _fromBody, ...linkBody } = input.body
      const row = yield* createLinkRecord({
        ...linkBody,
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
      return yield* LinkHistoryRoutes.history(input.params, input.query)
    }),
    getWorkspaceLinkHistory: os.links.getWorkspaceLinkHistory.effect(function* ({ input }) {
      return yield* LinkHistoryRoutes.history(input.params, input.query)
    }),
  },
})
