export const MAX_TAGS_PER_LINK = 20
export const MAX_TAG_LENGTH = 50

/** Trim and drop empty, overlong, or case-insensitively duplicate tags, keeping first-seen casing. */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, ' ')
    if (!tag || tag.length > MAX_TAG_LENGTH) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

/** Existing tags are kept; the result never exceeds the per-link cap. */
export function mergeTags(existing: readonly string[], added: readonly string[]): string[] {
  return normalizeTags([...existing, ...added]).slice(0, MAX_TAGS_PER_LINK)
}

export function parseTags(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json)
    return Array.isArray(value) ? value.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}
