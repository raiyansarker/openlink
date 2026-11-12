import { and, eq } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { link } from '@openlink/db/schema'
import { getDb } from '../db'
import { generateSlug } from './rules'

export { deriveLinkStatus, generateSlug } from './rules'

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

export async function createLinkRecord(input: {
  organizationId: string
  domainId: string
  userId: string
  slug?: string
  destinationUrl: string
  title?: string
  description?: string
  redirectStatus?: number
  activateAt?: Date
  expiresAt?: Date
  maxClicks?: number
  password?: string
  expiredDestinationUrl?: string
  fallbackDestinationUrl?: string
  tags?: string[]
  utm?: Record<string, string>
  metadata?: Record<string, unknown>
}) {
  const now = new Date()
  const slug = input.slug ?? generateSlug()
  const id = crypto.randomUUID()

  try {
    const [row] = await getDb()
      .insert(link)
      .values({
        id,
        organizationId: input.organizationId,
        domainId: input.domainId,
        slug,
        title: input.title,
        description: input.description,
        destinationUrl: input.destinationUrl,
        redirectStatus: input.redirectStatus ?? 302,
        status: input.activateAt && input.activateAt > now ? 'scheduled' : 'active',
        enabled: true,
        activateAt: input.activateAt,
        expiresAt: input.expiresAt,
        maxClicks: input.maxClicks,
        passwordHash: input.password ? hashPassword(input.password) : null,
        expiredDestinationUrl: input.expiredDestinationUrl,
        fallbackDestinationUrl: input.fallbackDestinationUrl,
        tagsJson: JSON.stringify(input.tags ?? []),
        utmJson: input.utm ? JSON.stringify(input.utm) : null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
        createdByUserId: input.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    return row!
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE')) {
      throw new Error('slug_conflict', { cause: error })
    }
    throw error
  }
}

export async function listLinksForDomain(domainId: string) {
  return getDb().select().from(link).where(eq(link.domainId, domainId))
}

export async function getLinkInDomain(domainId: string, linkId: string) {
  const [row] = await getDb()
    .select()
    .from(link)
    .where(and(eq(link.domainId, domainId), eq(link.id, linkId)))
    .limit(1)
  return row ?? null
}
