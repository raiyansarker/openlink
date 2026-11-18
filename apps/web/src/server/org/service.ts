import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { Effect } from 'effect'
import {
  organization,
  organizationInvite,
  organizationMember,
  user,
} from '@openlink/db/schema'
import { writeBatch } from '#/server/effect/batch'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { Onboarding } from '#/server/auth/onboarding'
import {
  createInviteToken,
  findBootstrapInviteByToken,
  hashInviteToken,
  inviteEmailMatches,
} from './invites'

export {
  InvalidBootstrapInvite,
  InvalidInvite,
  InviteEmailMismatch,
  OrganizationConflict,
} from './errors'
import {
  InvalidBootstrapInvite,
  InvalidInvite,
  InviteEmailMismatch,
  OrganizationConflict,
} from './errors'

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

/**
 * Create a workspace owned by `userId`, completing their onboarding. An invite
 * token is optional; when one is given it must be a valid bootstrap invite and
 * is consumed.
 */
export function createOrganizationWithBootstrapInvite(input: {
  userId: string
  name: string
  slug: string
  inviteToken?: string
}) {
  return Effect.gen(function* () {
    const bootstrap = input.inviteToken ? yield* findBootstrapInviteByToken(input.inviteToken) : null
    if (input.inviteToken && !bootstrap) {
      return yield* Effect.fail(new InvalidBootstrapInvite())
    }

    const db = yield* Db
    const id = crypto.randomUUID()
    const now = new Date()
    const statements = [
      db.insert(organization).values({ id, name: input.name, slug: input.slug, createdAt: now, updatedAt: now }).returning(),
      db.insert(organizationMember).values({
        id: crypto.randomUUID(),
        organizationId: id,
        userId: input.userId,
        role: 'owner',
        joinedAt: now,
      }),
      ...(bootstrap
        ? [db.update(organizationInvite).set({ acceptedAt: now }).where(eq(organizationInvite.id, bootstrap.id))]
        : []),
      Onboarding.markCompleteStatement(db, input.userId, now),
    ]
    // One batch: the workspace never exists without its owner, and onboarding completes with it.
    const [created] = yield* writeBatch('org.createOrganization', statements).pipe(
      Effect.mapError((error) =>
        isUniqueViolation(error.cause) ? new OrganizationConflict() : error,
      ),
    )
    return (created as (typeof organization.$inferSelect)[])[0]!
  })
}

export function createMemberInvite(input: {
  organizationId: string
  email: string
  role: typeof organizationInvite.$inferInsert.role
  /** Null when issued through an API key. */
  createdByUserId: string | null
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
    const [invite] = yield* operation('org.findMemberInvite', () =>
      db
        .select()
        .from(organizationInvite)
        .where(
          and(
            eq(organizationInvite.tokenHash, hashInviteToken(input.token)),
            eq(organizationInvite.kind, 'member'),
            isNull(organizationInvite.acceptedAt),
          ),
        )
        .limit(1),
    )
    return yield* joinFromInvite(invite, input)
  })
}

/** Accepts an invite from the invitee's inbox, where they see its id and not its token. */
export function acceptInviteById(input: { inviteId: string; userId: string; userEmail: string }) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [invite] = yield* operation('org.findMemberInviteById', () =>
      db
        .select()
        .from(organizationInvite)
        .where(
          and(
            eq(organizationInvite.id, input.inviteId),
            eq(organizationInvite.kind, 'member'),
            isNull(organizationInvite.acceptedAt),
          ),
        )
        .limit(1),
    )
    return yield* joinFromInvite(invite, input)
  })
}

/** Pending, unexpired member invites sent to `email`, with who sent them and to which workspace. */
export function listInvitesForEmail(email: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const now = new Date()
    return yield* operation('org.listInvitesForEmail', () =>
      db
        .select({
          id: organizationInvite.id,
          role: organizationInvite.role,
          expiresAt: organizationInvite.expiresAt,
          createdAt: organizationInvite.createdAt,
          organizationId: organization.id,
          organizationName: organization.name,
          organizationSlug: organization.slug,
          organizationLogoKey: organization.logoKey,
          invitedByName: user.name,
          invitedByImage: user.image,
        })
        .from(organizationInvite)
        .innerJoin(organization, eq(organization.id, organizationInvite.organizationId))
        .leftJoin(user, eq(user.id, organizationInvite.createdByUserId))
        .where(
          and(
            eq(organizationInvite.email, email.trim().toLowerCase()),
            eq(organizationInvite.kind, 'member'),
            isNull(organizationInvite.acceptedAt),
            gt(organizationInvite.expiresAt, now),
          ),
        )
        .orderBy(desc(organizationInvite.createdAt)),
    )
  })
}

/** The invitee turns an invite down: it is removed, as if revoked. */
export function declineInviteForEmail(input: { inviteId: string; userEmail: string }) {
  return Effect.gen(function* () {
    const db = yield* Db
    const [invite] = yield* operation('org.findInviteToDecline', () =>
      db
        .select({ id: organizationInvite.id, email: organizationInvite.email, organizationId: organizationInvite.organizationId })
        .from(organizationInvite)
        .where(
          and(
            eq(organizationInvite.id, input.inviteId),
            eq(organizationInvite.kind, 'member'),
            isNull(organizationInvite.acceptedAt),
          ),
        )
        .limit(1),
    )
    // Someone else's invite looks the same as a missing one.
    if (!invite || !invite.organizationId || !inviteEmailMatches(invite.email, input.userEmail)) {
      return yield* Effect.fail(new InvalidInvite())
    }
    yield* operation('org.declineInvite', () => db.delete(organizationInvite).where(eq(organizationInvite.id, invite.id)))
    return { id: invite.id, email: invite.email, organizationId: invite.organizationId }
  })
}

/** The shared part of accepting: checks the invite, then adds the member (once) and marks it used. */
function joinFromInvite(
  invite: typeof organizationInvite.$inferSelect | undefined,
  input: { userId: string; userEmail: string },
) {
  return Effect.gen(function* () {
    const db = yield* Db
    const now = new Date()
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
    // One batch: the person joins, the invite is used up and onboarding completes, or none of it happens.
    yield* writeBatch('org.acceptMemberInvite', [
      ...(existingMember
        ? []
        : [
            db.insert(organizationMember).values({
              id: crypto.randomUUID(),
              organizationId,
              userId: input.userId,
              role: invite.role,
              joinedAt: now,
            }),
          ]),
      db.update(organizationInvite).set({ acceptedAt: now }).where(eq(organizationInvite.id, invite.id)),
      // Joining someone else's workspace also counts as finishing onboarding.
      Onboarding.markCompleteStatement(db, input.userId, now),
    ])
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
