import { and, eq } from 'drizzle-orm'
import { organizationMember } from '@openlink/db/schema'
import { getDb } from '../db'

export async function getMembership(userId: string, organizationId: string) {
  const [row] = await getDb()
    .select()
    .from(organizationMember)
    .where(
      and(
        eq(organizationMember.userId, userId),
        eq(organizationMember.organizationId, organizationId),
      ),
    )
    .limit(1)

  return row ?? null
}

export { isAdmin, canManageLinks } from './permissions'
