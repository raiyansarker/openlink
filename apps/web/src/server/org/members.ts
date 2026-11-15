import { and, eq, isNull } from 'drizzle-orm'
import { Effect } from 'effect'
import {
  organization,
  organizationInvite,
  organizationMember,
  user,
} from '@openlink/db/schema'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { createInviteToken, hashInviteToken } from './invites'
import { assignableRoles, canManageMember, type OrganizationRole } from './permissions'
import { InviteNotFound, MemberNotFound, MemberPermissionDenied, OrganizationConflict } from './errors'

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 14

const memberColumns = {
  userId: organizationMember.userId,
  role: organizationMember.role,
  joinedAt: organizationMember.joinedAt,
  name: user.name,
  email: user.email,
  image: user.image,
}

export type WorkspaceMemberRow = {
  userId: string
  role: OrganizationRole
  joinedAt: Date
  name: string
  email: string
  image: string | null
}

export function listMembers(organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    return yield* operation('members.list', () =>
      db
        .select(memberColumns)
        .from(organizationMember)
        .innerJoin(user, eq(user.id, organizationMember.userId))
        .where(eq(organizationMember.organizationId, organizationId))
        .orderBy(organizationMember.joinedAt),
    )
  })
}

const findMember = (organizationId: string, userId: string) =>
  Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('members.find', () =>
      db
        .select(memberColumns)
        .from(organizationMember)
        .innerJoin(user, eq(user.id, organizationMember.userId))
        .where(
          and(
            eq(organizationMember.organizationId, organizationId),
            eq(organizationMember.userId, userId),
          ),
        )
        .limit(1),
    )
    return row ?? null
  })

export function updateMemberRole(input: {
  organizationId: string
  actorRole: OrganizationRole
  targetUserId: string
  role: Exclude<OrganizationRole, 'owner'>
}) {
  return Effect.gen(function* () {
    const target = yield* findMember(input.organizationId, input.targetUserId)
    if (!target) return yield* Effect.fail(new MemberNotFound())
    if (!canManageMember(input.actorRole, target.role)) {
      return yield* Effect.fail(new MemberPermissionDenied({ reason: 'You cannot change this member' }))
    }
    if (!assignableRoles(input.actorRole).includes(input.role)) {
      return yield* Effect.fail(new MemberPermissionDenied({ reason: 'You cannot assign this role' }))
    }
    const db = yield* Db
    yield* operation('members.updateRole', () =>
      db
        .update(organizationMember)
        .set({ role: input.role })
        .where(
          and(
            eq(organizationMember.organizationId, input.organizationId),
            eq(organizationMember.userId, input.targetUserId),
          ),
        ),
    )
    return { ...target, role: input.role, previousRole: target.role } satisfies WorkspaceMemberRow & {
      previousRole: OrganizationRole
    }
  })
}

/** Remove a member, or let someone leave. Owners must transfer ownership first. */
export function removeMember(input: {
  organizationId: string
  actorUserId: string
  actorRole: OrganizationRole
  targetUserId: string
}) {
  return Effect.gen(function* () {
    const target = yield* findMember(input.organizationId, input.targetUserId)
    if (!target) return yield* Effect.fail(new MemberNotFound())
    const leaving = input.actorUserId === input.targetUserId
    if (target.role === 'owner') {
      return yield* Effect.fail(
        new MemberPermissionDenied({ reason: 'Transfer ownership before removing the owner' }),
      )
    }
    if (!leaving && !canManageMember(input.actorRole, target.role)) {
      return yield* Effect.fail(new MemberPermissionDenied({ reason: 'You cannot remove this member' }))
    }
    const db = yield* Db
    yield* operation('members.remove', () =>
      db
        .delete(organizationMember)
        .where(
          and(
            eq(organizationMember.organizationId, input.organizationId),
            eq(organizationMember.userId, input.targetUserId),
          ),
        ),
    )
    return target
  })
}

/** Make an existing member the owner; the previous owner becomes an admin. */
export function transferOwnership(input: {
  organizationId: string
  actorUserId: string
  targetUserId: string
}) {
  return Effect.gen(function* () {
    if (input.actorUserId === input.targetUserId) {
      return yield* Effect.fail(new MemberPermissionDenied({ reason: 'You already own this workspace' }))
    }
    const target = yield* findMember(input.organizationId, input.targetUserId)
    if (!target) return yield* Effect.fail(new MemberNotFound())
    const db = yield* Db
    const setRole = (userId: string, role: OrganizationRole) =>
      operation(`members.transfer.${role}`, () =>
        db
          .update(organizationMember)
          .set({ role })
          .where(
            and(
              eq(organizationMember.organizationId, input.organizationId),
              eq(organizationMember.userId, userId),
            ),
          ),
      )
    // Promote first: a failure between the steps leaves two owners, never none.
    yield* setRole(input.targetUserId, 'owner')
    yield* setRole(input.actorUserId, 'admin')
    return target
  })
}

function isUniqueViolation(cause: unknown): boolean {
  const seen = new Set<unknown>()
  while (cause instanceof Error && !seen.has(cause)) {
    seen.add(cause)
    if (/UNIQUE/i.test(cause.message)) return true
    cause = cause.cause
  }
  return false
}

export function updateOrganization(input: {
  organizationId: string
  name?: string
  slug?: string
}) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('org.update', () =>
      db
        .update(organization)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          updatedAt: new Date(),
        })
        .where(eq(organization.id, input.organizationId))
        .returning(),
    ).pipe(
      Effect.mapError((error) =>
        isUniqueViolation(error.cause) ? new OrganizationConflict() : error,
      ),
    )
    return row ?? null
  })
}

export function deleteOrganization(organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    yield* operation('org.delete', () =>
      db.delete(organization).where(eq(organization.id, organizationId)),
    )
  })
}

const pendingInviteFilter = (organizationId: string) =>
  and(
    eq(organizationInvite.organizationId, organizationId),
    eq(organizationInvite.kind, 'member'),
    isNull(organizationInvite.acceptedAt),
  )

export function listPendingInvites(organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    return yield* operation('invites.list', () =>
      db
        .select()
        .from(organizationInvite)
        .where(pendingInviteFilter(organizationId))
        .orderBy(organizationInvite.createdAt),
    )
  })
}

export function revokeInvite(organizationId: string, inviteId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const deleted = yield* operation('invites.revoke', () =>
      db
        .delete(organizationInvite)
        .where(and(pendingInviteFilter(organizationId), eq(organizationInvite.id, inviteId)))
        .returning({ id: organizationInvite.id, email: organizationInvite.email }),
    )
    if (deleted.length === 0) return yield* Effect.fail(new InviteNotFound())
    return deleted[0]!
  })
}

/** Rotate the token and push the expiry out; the old token stops working. */
export function resendInvite(organizationId: string, inviteId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const token = createInviteToken()
    const [invite] = yield* operation('invites.resend', () =>
      db
        .update(organizationInvite)
        .set({ tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) })
        .where(and(pendingInviteFilter(organizationId), eq(organizationInvite.id, inviteId)))
        .returning(),
    )
    if (!invite) return yield* Effect.fail(new InviteNotFound())
    return { invite, token }
  })
}
