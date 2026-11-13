import { and, eq, isNull } from 'drizzle-orm'
import { Data, Effect } from 'effect'
import {
  organization,
  organizationInvite,
  organizationMember,
} from '@openlink/db/schema'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import {
  createInviteToken,
  findBootstrapInviteByToken,
  hashInviteToken,
  inviteEmailMatches,
} from './invites'

export class InvalidBootstrapInvite extends Data.TaggedError(
  'InvalidBootstrapInvite',
)<{}> {}
export class InvalidInvite extends Data.TaggedError('InvalidInvite')<{}> {}
export class InviteEmailMismatch extends Data.TaggedError(
  'InviteEmailMismatch',
)<{}> {}
export class OrganizationConflict extends Data.TaggedError(
  'OrganizationConflict',
)<{}> {}

function isUniqueViolation(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false
  return (
    cause.message.includes('UNIQUE') ||
    (cause.cause !== undefined &&
      cause.cause !== cause &&
      isUniqueViolation(cause.cause))
  )
}

export function listOrganizationsForUser(userId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    return yield* operation('org.listOrganizationsForUser', () =>
      db
        .select({ organization, member: organizationMember })
        .from(organizationMember)
        .innerJoin(
          organization,
          eq(organization.id, organizationMember.organizationId),
        )
        .where(eq(organizationMember.userId, userId)),
    )
  })
}

export function getOrganizationById(organizationId: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [row] = yield* operation('org.getOrganizationById', () =>
      db
        .select()
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1),
    )
    return row ?? null
  })
}

export function createOrganizationWithBootstrapInvite(input: {
  userId: string
  name: string
  slug: string
  inviteToken: string
}) {
  return Effect.gen(function* () {
    const bootstrap = yield* findBootstrapInviteByToken(input.inviteToken)
    if (!bootstrap) {
      return yield* Effect.fail(new InvalidBootstrapInvite())
    }

    const db = yield* Db
    const id = crypto.randomUUID()
    const now = new Date()
    const [org] = yield* operation('org.createOrganization', () =>
      db
        .insert(organization)
        .values({
          id,
          name: input.name,
          slug: input.slug,
          createdAt: now,
          updatedAt: now,
        })
        .returning(),
    ).pipe(
      Effect.mapError((error) =>
        isUniqueViolation(error.cause) ? new OrganizationConflict() : error,
      ),
    )

    yield* operation('org.createOwnerMembership', () =>
      db.insert(organizationMember).values({
        id: crypto.randomUUID(),
        organizationId: org!.id,
        userId: input.userId,
        role: 'owner',
        joinedAt: now,
      }),
    )
    yield* operation('org.acceptBootstrapInvite', () =>
      db
        .update(organizationInvite)
        .set({ acceptedAt: now })
        .where(eq(organizationInvite.id, bootstrap.id)),
    )
    return org!
  })
}

export function createMemberInvite(input: {
  organizationId: string
  email: string
  role: typeof organizationInvite.$inferInsert.role
  createdByUserId: string
}) {
  return Effect.gen(function* () {
    const db = yield* Db
    const token = createInviteToken()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14)
    const [invite] = yield* operation('org.createMemberInvite', () =>
      db
        .insert(organizationInvite)
        .values({
          id: crypto.randomUUID(),
          organizationId: input.organizationId,
          email: input.email.toLowerCase(),
          role: input.role,
          tokenHash: hashInviteToken(token),
          kind: 'member',
          expiresAt,
          createdByUserId: input.createdByUserId,
          createdAt: now,
        })
        .returning(),
    )
    return { invite: invite!, token }
  })
}

export function acceptMemberInvite(input: {
  userId: string
  userEmail: string
  token: string
}) {
  return Effect.gen(function* () {
    const db = yield* Db
    const tokenHash = hashInviteToken(input.token)
    const now = new Date()
    const [invite] = yield* operation('org.findMemberInvite', () =>
      db
        .select()
        .from(organizationInvite)
        .where(
          and(
            eq(organizationInvite.tokenHash, tokenHash),
            eq(organizationInvite.kind, 'member'),
            isNull(organizationInvite.acceptedAt),
          ),
        )
        .limit(1),
    )
    if (!invite || !invite.organizationId || invite.expiresAt <= now) {
      return yield* Effect.fail(new InvalidInvite())
    }
    if (!inviteEmailMatches(invite.email, input.userEmail)) {
      return yield* Effect.fail(new InviteEmailMismatch())
    }

    const organizationId = invite.organizationId
    const [existingMember] = yield* operation('org.findExistingMember', () =>
      db
        .select()
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.organizationId, organizationId),
            eq(organizationMember.userId, input.userId),
          ),
        )
        .limit(1),
    )
    if (!existingMember) {
      yield* operation('org.createInvitedMembership', () =>
        db.insert(organizationMember).values({
          id: crypto.randomUUID(),
          organizationId,
          userId: input.userId,
          role: invite.role,
          joinedAt: now,
        }),
      )
    }
    yield* operation('org.acceptMemberInvite', () =>
      db
        .update(organizationInvite)
        .set({ acceptedAt: now })
        .where(eq(organizationInvite.id, invite.id)),
    )
    const org = yield* getOrganizationById(organizationId)
    if (existingMember) {
      return { org: org!, member: existingMember }
    }
    const [member] = yield* operation('org.getAcceptedMembership', () =>
      db
        .select()
        .from(organizationMember)
        .where(
          and(
            eq(organizationMember.organizationId, organizationId),
            eq(organizationMember.userId, input.userId),
          ),
        )
        .limit(1),
    )
    return { org: org!, member: member! }
  })
}
