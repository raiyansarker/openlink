import { and, eq, isNull } from 'drizzle-orm'
import {
  organization,
  organizationInvite,
  organizationMember,
} from '@openlink/db/schema'
import { getDb } from '../db'
import {
  createInviteToken,
  findBootstrapInviteByToken,
  hashInviteToken,
  inviteEmailMatches,
} from './invites'

export async function listOrganizationsForUser(userId: string) {
  return getDb()
    .select({
      organization,
      member: organizationMember,
    })
    .from(organizationMember)
    .innerJoin(organization, eq(organization.id, organizationMember.organizationId))
    .where(eq(organizationMember.userId, userId))
}

export async function getOrganizationById(organizationId: string) {
  const [row] = await getDb()
    .select()
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1)
  return row ?? null
}

export async function createOrganizationWithBootstrapInvite(input: {
  userId: string
  name: string
  slug: string
  inviteToken: string
}) {
  const bootstrap = await findBootstrapInviteByToken(input.inviteToken)
  if (!bootstrap) {
    throw new Error('invalid_bootstrap_invite')
  }

  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date()

  const [org] = await db
    .insert(organization)
    .values({ id, name: input.name, slug: input.slug, createdAt: now, updatedAt: now })
    .returning()

  await db.insert(organizationMember).values({
    id: crypto.randomUUID(),
    organizationId: org!.id,
    userId: input.userId,
    role: 'admin',
    joinedAt: now,
  })

  await db
    .update(organizationInvite)
    .set({ acceptedAt: now })
    .where(eq(organizationInvite.id, bootstrap.id))

  return org!
}

export async function createMemberInvite(input: {
  organizationId: string
  email: string
  role: 'admin' | 'member'
  createdByUserId: string
}) {
  const token = createInviteToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 14)

  const [invite] = await getDb()
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
    .returning()

  return { invite: invite!, token }
}

export async function acceptMemberInvite(input: {
  userId: string
  userEmail: string
  token: string
}) {
  const tokenHash = hashInviteToken(input.token)
  const now = new Date()

  const [invite] = await getDb()
    .select()
    .from(organizationInvite)
    .where(
      and(
        eq(organizationInvite.tokenHash, tokenHash),
        eq(organizationInvite.kind, 'member'),
        isNull(organizationInvite.acceptedAt),
      ),
    )
    .limit(1)

  if (!invite || !invite.organizationId || invite.expiresAt <= now) {
    throw new Error('invalid_invite')
  }

  if (!inviteEmailMatches(invite.email, input.userEmail)) {
    throw new Error('invite_email_mismatch')
  }

  const organizationId = invite.organizationId
  const existingMember = await getDb()
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, organizationId),
        eq(organizationMember.userId, input.userId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0])

  if (existingMember) {
    const db = getDb()
    await db
      .update(organizationInvite)
      .set({ acceptedAt: now })
      .where(eq(organizationInvite.id, invite.id))

    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)

    return { org: org!, member: existingMember }
  }

  const db = getDb()

  await db.insert(organizationMember).values({
    id: crypto.randomUUID(),
    organizationId: invite.organizationId!,
    userId: input.userId,
    role: invite.role,
    joinedAt: now,
  })

  await db
    .update(organizationInvite)
    .set({ acceptedAt: now })
    .where(eq(organizationInvite.id, invite.id))

  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, invite.organizationId!))
    .limit(1)

  const [member] = await db
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.organizationId, invite.organizationId!),
        eq(organizationMember.userId, input.userId),
      ),
    )
    .limit(1)

  return { org: org!, member: member! }
}
