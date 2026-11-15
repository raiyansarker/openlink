export const MAX_COMMENT_LENGTH = 4000
export const MAX_REACTION_KINDS = 10
export const EXCERPT_LENGTH = 80

export type Reactions = Record<string, string[]>

export function normalizeCommentBody(body: string): string | null {
  const trimmed = body.trim()
  return trimmed.length === 0 || trimmed.length > MAX_COMMENT_LENGTH ? null : trimmed
}

export function parseReactions(json: string): Reactions {
  try {
    const value: unknown = JSON.parse(json)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
    const result: Reactions = {}
    for (const [emoji, users] of Object.entries(value)) {
      if (Array.isArray(users)) result[emoji] = users.filter((u): u is string => typeof u === 'string')
    }
    return result
  } catch {
    return {}
  }
}

/**
 * Toggle `userId`'s reaction. Empty reactions are dropped, and a new kind is
 * refused (`null`) once a comment already has the maximum number of kinds.
 */
export function toggleReaction(reactions: Reactions, emoji: string, userId: string): Reactions | null {
  const current = reactions[emoji] ?? []
  if (current.includes(userId)) {
    const remaining = current.filter((id) => id !== userId)
    const { [emoji]: _removed, ...rest } = reactions
    return remaining.length > 0 ? { ...rest, [emoji]: remaining } : rest
  }
  if (!(emoji in reactions) && Object.keys(reactions).length >= MAX_REACTION_KINDS) return null
  return { ...reactions, [emoji]: [...current, userId] }
}

/** Single-line preview for activity entries. */
export function excerpt(body: string, length = EXCERPT_LENGTH) {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length <= length ? flat : `${flat.slice(0, length - 1).trimEnd()}…`
}
