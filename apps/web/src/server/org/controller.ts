import { Effect } from 'effect'

import {
  toMembershipDto,
  toOrganizationDto,
  toPendingInviteDto,
  toWorkspaceMemberDto,
} from '#/server/api/serializers'
import { requireOrgAdminEffect, requireOrgMemberEffect, requireOrgOwnerEffect } from '#/server/effect/access'
import { principalUserId } from '#/server/effect/principal'
import { requireAuthSession } from '#/server/effect/session'
import { audit } from '#/server/activity/audit'
import { MediaStore } from '#/server/media/media-store'
import { os } from '#/server/orpc/implement'
import type { ErrorFactories } from '#/server/orpc/errors'

import type { MemberPermissionDenied } from './errors'
import {
  deleteOrganization,
  listMembers,
  listPendingInvites,
  removeMember,
  resendInvite,
  revokeInvite,
  transferOwnership,
  updateMemberRole,
} from './members'
import {
  createMemberInvite,
  getOrganizationById,
  listOrganizationsForUser,
} from './service'
import { isAdmin } from './permissions'
import { sendInviteEmail } from './invite-email'
import { createWorkspace, suggestWorkspaceSlug, updateWorkspace } from './workspace'

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

export const organizationsController = {
  suggestOrganizationSlug: os.organizations.suggestOrganizationSlug.effect(function* ({ input }) {
    yield* requireAuthSession
    return { slug: yield* suggestWorkspaceSlug(input.query.name) }
  }),

  listOrganizations: os.organizations.listOrganizations.effect(function* () {
    const session = yield* requireAuthSession
    const rows = yield* listOrganizationsForUser(session.session.user.id)
    return { items: rows.map((row) => toMembershipDto(row.organization, row.member)) }
  }),

  createOrganization: os.organizations.createOrganization.effect(function* ({ input, errors }) {
    const session = yield* requireAuthSession
    const org = yield* createWorkspace({ userId: session.session.user.id, ...input.body }).pipe(
      Effect.catchTags({
        UploadRejected: (error) => Effect.fail(errors.BAD_REQUEST({ message: error.message })),
        OrganizationConflict: () => Effect.fail(errors.CONFLICT({ message: 'Unable to create organization' })),
        BackendError: () => Effect.fail(errors.CONFLICT({ message: 'Unable to create organization' })),
      }),
    )
    return toOrganizationDto(org)
  }),

  getOrganization: os.organizations.getOrganization.effect(function* ({ input, errors }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    const org = yield* getOrganizationById(input.params.organizationId)
    if (!org) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Organization not found' }))
    return toOrganizationDto(org)
  }),

  updateOrganization: os.organizations.updateOrganization.effect(function* ({ input, errors }) {
    const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
    const saved = yield* updateWorkspace({ organizationId: input.params.organizationId, ...input.body }).pipe(
      Effect.catchTags({
        UploadRejected: (error) => Effect.fail(errors.BAD_REQUEST({ message: error.message })),
        OrganizationConflict: () => Effect.fail(errors.CONFLICT({ message: 'That workspace URL is already taken' })),
        BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to update workspace' })),
      }),
    )
    if (!saved) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Organization not found' }))
    const { before, after: org, logoChanged } = saved
    const changes = [
      ...(before.name !== org.name ? [{ label: 'Name', from: before.name, to: org.name }] : []),
      ...(before.slug !== org.slug ? [{ label: 'URL', from: before.slug, to: org.slug }] : []),
      ...(logoChanged ? [{ label: 'Logo', from: before.logoKey ? 'set' : 'none', to: org.logoKey ? 'updated' : 'none' }] : []),
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
    const { session } = yield* requireOrgAdminEffect(input.params.organizationId)
    const { invite } = yield* resendInvite(input.params.organizationId, input.params.inviteId).pipe(
      Effect.catchTags(onInviteNotFound(errors)),
    )
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'invite.resent',
      target: { type: 'invite', id: invite.id, label: invite.email },
    })
    yield* sendInviteEmail({ organizationId: input.params.organizationId, invite, inviter: session })
    return toPendingInviteDto(invite)
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
    const { invite } = yield* createMemberInvite({
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
    yield* sendInviteEmail({ organizationId: input.params.organizationId, invite, inviter: session })
    return {
      id: invite.id,
      organizationId: invite.organizationId!,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    }
  }),
}
