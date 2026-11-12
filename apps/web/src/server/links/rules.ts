import { randomBytes } from 'node:crypto'
import type { link } from '@openlink/db/schema'

const SLUG_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export function generateSlug(length = 8) {
  const bytes = randomBytes(length)
  let output = ''
  for (let i = 0; i < length; i += 1) {
    output += SLUG_ALPHABET[bytes[i]! % SLUG_ALPHABET.length]
  }
  return output
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
