import { and, eq } from 'drizzle-orm'
import { customDomain } from '@openlink/db/schema'
import { getDb } from '../db'
import { getMembership } from '../org/access'

export async function requireOrgMembership(userId: string, organizationId: string) {
  return getMembership(userId, organizationId)
}

export async function getDomainInOrganization(domainId: string, organizationId: string) {
  const [row] = await getDb()
    .select()
    .from(customDomain)
    .where(
      and(eq(customDomain.id, domainId), eq(customDomain.organizationId, organizationId)),
    )
    .limit(1)

  return row ?? null
}
