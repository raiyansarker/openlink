import type { OpenLinkDb } from '@openlink/db'
import { organization, organizationInvite, organizationMember, user, verification } from '@openlink/db/schema'
import type { EmailMessage } from '@openlink/email'
import { createEmailVerificationToken } from 'better-auth/api'
import { and, desc, eq, gt, inArray, like } from 'drizzle-orm'

import type { WorkerBindings } from '../env'
import type { EmailEvent } from './events'
import { EmailFormat } from './format'
import type { EmailDraft } from './job'

/** Better Auth's verification and reset links are valid for one hour. */
const LINK_LIFETIME_SECONDS = 60 * 60
const LINK_LIFETIME = '1 hour'

/** Where the auth links land in the app (the same paths the sign-up and reset pages request). */
const VERIFY_CALLBACK = '/verify-email'
const RESET_CALLBACK = '/reset-password'

export type ComposedEmail = { to: string; message: EmailMessage }

/** Why an event became no email. Logged; never an error, since nothing is wrong. */
export type SkipReason =
  | 'user_deleted'
  | 'already_verified'
  | 'no_reset_token'
  | 'invite_gone'
  | 'invite_accepted'
  | 'invite_expired'
  /** Accepted-invite notices: no person sent it (an API key), they are gone or left, or the joiner left. */
  | 'no_inviter'
  | 'member_gone'

type Env = Pick<WorkerBindings, 'BETTER_AUTH_URL' | 'BETTER_AUTH_SECRET'>

/** Add the app URL and logo that every template shares. */
export function brandEmail(env: Pick<WorkerBindings, 'BETTER_AUTH_URL'>, draft: EmailDraft): EmailMessage {
  const baseUrl = new URL(env.BETTER_AUTH_URL).origin
  return { template: draft.template, props: { ...draft.props, baseUrl, logoUrl: `${baseUrl}/logo192.png` } } as EmailMessage
}

const greeting = (person: { name: string | null; email: string }) => person.name?.trim() || person.email
const authUrl = (env: Env, path: string) => new URL(`/api/auth${path}`, env.BETTER_AUTH_URL)

async function findUser(db: OpenLinkDb, userId: string) {
  const [row] = await db.select({ id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified }).from(user).where(eq(user.id, userId)).limit(1)
  return row ?? null
}

/**
 * The newest unexpired reset token Better Auth issued for this user. It stores each one as a
 * `verification` row `reset-password:<token>` holding the user id (plain, the default).
 */
async function latestResetToken(db: OpenLinkDb, userId: string, now: Date) {
  const [row] = await db
    .select({ identifier: verification.identifier })
    .from(verification)
    .where(and(eq(verification.value, userId), like(verification.identifier, 'reset-password:%'), gt(verification.expiresAt, now)))
    .orderBy(desc(verification.createdAt))
    .limit(1)
  return row?.identifier.slice('reset-password:'.length) || null
}

/**
 * Build the email for an event from what is in the database now. Returns a skip reason
 * when the email no longer makes sense: the account was deleted, the address was already
 * verified, the reset was used up, or the invite was revoked, accepted or has expired.
 */
export async function composeEmail(db: OpenLinkDb, env: Env, event: EmailEvent, now = new Date()): Promise<ComposedEmail | SkipReason> {
  if (event.type === 'workspace-invite') {
    const [invite] = await db
      .select({ email: organizationInvite.email, role: organizationInvite.role, expiresAt: organizationInvite.expiresAt, acceptedAt: organizationInvite.acceptedAt, workspace: organization.name })
      .from(organizationInvite)
      .innerJoin(organization, eq(organization.id, organizationInvite.organizationId))
      .where(eq(organizationInvite.id, event.inviteId))
      .limit(1)
    if (!invite) return 'invite_gone'
    if (invite.acceptedAt) return 'invite_accepted'
    if (invite.expiresAt <= now) return 'invite_expired'
    const inviter = event.inviterUserId ? await findUser(db, event.inviterUserId) : null
    return {
      to: invite.email,
      message: brandEmail(env, {
        template: 'workspace-invite',
        props: {
          workspaceName: invite.workspace,
          // Keys are not people, and a deleted inviter has no name: name the workspace instead.
          inviterName: inviter?.name?.trim() || `The ${invite.workspace} team`,
          role: EmailFormat.role(invite.role),
          // The invite's own page. It shows nothing until the invited address signs in.
          inviteUrl: new URL(`/invite/${encodeURIComponent(event.inviteId)}`, env.BETTER_AUTH_URL).toString(),
          expiresAt: EmailFormat.date(invite.expiresAt),
        },
      }),
    }
  }

  if (event.type === 'invite-accepted') return composeInviteAccepted(db, env, event)

  const person = await findUser(db, event.userId)
  if (!person) return 'user_deleted'
  const name = greeting(person)

  switch (event.type) {
    case 'email-verification': {
      if (person.emailVerified) return 'already_verified'
      // A fresh link, valid for an hour from when it is sent.
      const token = await createEmailVerificationToken(env.BETTER_AUTH_SECRET, person.email, undefined, LINK_LIFETIME_SECONDS, { userId: person.id })
      const url = authUrl(env, '/verify-email')
      url.searchParams.set('token', token)
      url.searchParams.set('callbackURL', VERIFY_CALLBACK)
      return { to: person.email, message: brandEmail(env, { template: 'email-verification', props: { name, verifyUrl: url.toString(), expiresIn: LINK_LIFETIME } }) }
    }
    case 'password-reset': {
      const token = await latestResetToken(db, person.id, now)
      if (!token) return 'no_reset_token'
      const url = authUrl(env, `/reset-password/${encodeURIComponent(token)}`)
      url.searchParams.set('callbackURL', RESET_CALLBACK)
      return { to: person.email, message: brandEmail(env, { template: 'password-reset', props: { name, resetUrl: url.toString(), expiresIn: LINK_LIFETIME } }) }
    }
    case 'welcome':
      return {
        to: person.email,
        message: brandEmail(env, { template: 'welcome', props: { name, dashboardUrl: new URL('/dashboard', env.BETTER_AUTH_URL).toString() } }),
      }
    case 'password-changed':
      return {
        to: person.email,
        message: brandEmail(env, {
          template: 'security-alert',
          props: {
            name,
            event: 'Your password was changed',
            device: event.device,
            location: event.location,
            occurredAt: EmailFormat.dateTime(new Date(event.occurredAt)),
            securityUrl: new URL('/settings/devices', env.BETTER_AUTH_URL).toString(),
          },
        }),
      }
  }
}

/**
 * "Ada joined Acme", to whoever sent the invite. Only while the invite was really accepted
 * by that person, the inviter is still in the workspace, and the new member still is too.
 */
async function composeInviteAccepted(
  db: OpenLinkDb,
  env: Env,
  event: Extract<EmailEvent, { type: 'invite-accepted' }>,
): Promise<ComposedEmail | SkipReason> {
  const [invite] = await db
    .select({ organizationId: organizationInvite.organizationId, inviterId: organizationInvite.createdByUserId, acceptedAt: organizationInvite.acceptedAt })
    .from(organizationInvite)
    .where(eq(organizationInvite.id, event.inviteId))
    .limit(1)
  if (!invite?.organizationId || !invite.acceptedAt) return 'invite_gone'
  if (!invite.inviterId || invite.inviterId === event.memberUserId) return 'no_inviter'
  const organizationId = invite.organizationId

  const memberships = await db
    .select({ userId: organizationMember.userId, role: organizationMember.role })
    .from(organizationMember)
    .where(and(eq(organizationMember.organizationId, organizationId), inArray(organizationMember.userId, [invite.inviterId, event.memberUserId])))
  const joined = memberships.find((row) => row.userId === event.memberUserId)
  if (!joined) return 'member_gone'
  if (!memberships.some((row) => row.userId === invite.inviterId)) return 'no_inviter'

  const [inviter, member, [workspace]] = await Promise.all([
    findUser(db, invite.inviterId),
    findUser(db, event.memberUserId),
    db.select({ name: organization.name, slug: organization.slug }).from(organization).where(eq(organization.id, organizationId)).limit(1),
  ])
  if (!inviter) return 'no_inviter'
  if (!member || !workspace) return 'member_gone'
  return {
    to: inviter.email,
    message: brandEmail(env, {
      template: 'member-joined',
      props: {
        recipientName: inviter.name?.trim() || undefined,
        memberName: greeting(member),
        workspaceName: workspace.name,
        role: EmailFormat.role(joined.role),
        workspaceUrl: new URL(`/w/${workspace.slug}`, env.BETTER_AUTH_URL).toString(),
      },
    }),
  }
}
