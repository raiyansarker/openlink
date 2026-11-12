import { and, eq } from 'drizzle-orm'
import { createHash, randomBytes } from 'node:crypto'
import { link } from '@openlink/db/schema'
import { getDb } from '../db'

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateSlug(length = 8) {
  const bytes = randomBytes(length)
  let output = ''
  for (let i = 0; i < length; i += 1) {
    output += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length]
  }
  return output
}

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex')
}

export function deriveLinkStatus(row: typeof link.$inferSelect, now = new Date()) {
  if (!row.enabled || row.status === 'disabled' || row.status === 'paused') {
    return row.status === 'paused' ? 'paused' : 'disabled'
  }
  if (row.activateAt && row.activateAt > now) return 'scheduled'
  if (row.expiresAt && row.expiresAt <= now) return 'expired'
  if (row.maxClicks != null && row.clickCount >= row.maxClicks) return 'expired'
  return row.status === 'draft' ? 'draft' : 'active'
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
      throw new Error('slug_conflict')
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
