import { createHash, randomBytes } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { organizationInvite } from '@openlink/db/schema'
import { getDb } from '../db'

export function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createInviteToken() {
  return randomBytes(24).toString('base64url')
}

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
