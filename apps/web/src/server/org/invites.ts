import { and, eq, isNull } from 'drizzle-orm'
import { organizationInvite } from '@openlink/db/schema'
import { getDb } from '../db'
import { hashInviteToken } from './invite-tokens'

export { createInviteToken, hashInviteToken } from './invite-tokens'

export async function findBootstrapInviteByToken(token: string) {
  const tokenHash = hashInviteToken(token)
  const [invite] = await getDb()
    .select()
    .from(organizationInvite)
    .where(
      and(
        eq(organizationInvite.kind, 'bootstrap'),
        eq(organizationInvite.tokenHash, tokenHash),
        isNull(organizationInvite.acceptedAt),
      ),
    )
    .limit(1)

  return invite ?? null
}
