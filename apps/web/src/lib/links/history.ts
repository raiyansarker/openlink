import type { LinkHistoryEntry } from '#/lib/api/types'

/** Link events the timeline knows how to describe; others are left out. */
const SUMMARIES: Record<string, string | null> = {
  'link.created': 'Created the link',
  'link.held': 'Put the link on hold',
  'link.released': 'Released the hold',
  'link.moved': 'Moved to another folder',
  'link.tagged': 'Changed tags',
  // Edits are described by what changed.
  'link.updated': null,
}

export function isShownInHistory(entry: LinkHistoryEntry): boolean {
  return entry.action in SUMMARIES
}

/** One line for a history entry, e.g. "Changed notes" or "Changed 3 settings". */
export function historySummary(entry: LinkHistoryEntry): string {
  const fixed = SUMMARIES[entry.action]
  if (fixed) return fixed
  const changes = entry.changes ?? []
  return changes.length === 1 ? `Changed ${changes[0]!.label.toLowerCase()}` : `Changed ${changes.length} settings`
}
