import type { link } from '@openlink/db/schema'

export type ActivityCategory = 'links' | 'domains' | 'members' | 'security' | 'developers'

/** Past-tense phrase shown in the feed, keyed by machine action. */
export const ACTION_DEFINITIONS = {
  'link.created': { category: 'links', phrase: 'created link' },
  'link.updated': { category: 'links', phrase: 'updated link' },
  'link.deleted': { category: 'links', phrase: 'deleted link' },
  'link.moved': { category: 'links', phrase: 'moved link' },
  'link.tagged': { category: 'links', phrase: 'tagged link' },
  'link.commented': { category: 'links', phrase: 'commented on link' },
  'folder.created': { category: 'links', phrase: 'created folder' },
  'folder.updated': { category: 'links', phrase: 'updated folder' },
  'folder.deleted': { category: 'links', phrase: 'deleted folder' },
  'domain.added': { category: 'domains', phrase: 'added domain' },
  'domain.removed': { category: 'domains', phrase: 'removed domain' },
  'member.invited': { category: 'members', phrase: 'invited' },
  'member.joined': { category: 'members', phrase: 'joined the workspace' },
  'member.role_changed': { category: 'members', phrase: 'changed the role of' },
  'member.removed': { category: 'members', phrase: 'removed' },
  'invite.revoked': { category: 'members', phrase: 'revoked the invite for' },
  'workspace.updated': { category: 'members', phrase: 'updated workspace' },
  'workspace.ownership_transferred': { category: 'security', phrase: 'transferred ownership to' },
} as const satisfies Record<string, { category: ActivityCategory; phrase: string }>

export type ActivityAction = keyof typeof ACTION_DEFINITIONS

export const isKnownAction = (action: string): action is ActivityAction => action in ACTION_DEFINITIONS

export type Change = { label: string; from: string; to: string }

type LinkRow = typeof link.$inferSelect

const show = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value))
const showDate = (value: Date | null) => (value ? value.toISOString() : '—')

/** Which fields appear in history, in display order. */
const TRACKED: { label: string; read: (row: LinkRow) => string }[] = [
  { label: 'Destination', read: (r) => show(r.destinationUrl) },
  { label: 'Title', read: (r) => show(r.title) },
  { label: 'Description', read: (r) => show(r.description) },
  { label: 'Redirect status', read: (r) => show(r.redirectStatus) },
  { label: 'Status', read: (r) => show(r.status) },
  { label: 'Enabled', read: (r) => (r.enabled ? 'yes' : 'no') },
  { label: 'Activates', read: (r) => showDate(r.activateAt) },
  { label: 'Expires', read: (r) => showDate(r.expiresAt) },
  { label: 'Max clicks', read: (r) => show(r.maxClicks) },
  { label: 'Password', read: (r) => (r.passwordHash ? 'set' : 'none') },
  { label: 'Expired destination', read: (r) => show(r.expiredDestinationUrl) },
  { label: 'Fallback destination', read: (r) => show(r.fallbackDestinationUrl) },
  { label: 'Folder', read: (r) => show(r.folderId) },
  { label: 'Tags', read: (r) => safeList(r.tagsJson) },
  { label: 'UTM', read: (r) => show(r.utmJson) },
]

function safeList(json: string) {
  try {
    const value: unknown = JSON.parse(json)
    return Array.isArray(value) && value.length > 0 ? value.join(', ') : '—'
  } catch {
    return '—'
  }
}

/** Field-level differences between two versions of a link. Secrets are never included. */
export function diffLink(before: LinkRow, after: LinkRow): Change[] {
  return TRACKED.flatMap(({ label, read }) => {
    const from = read(before)
    const to = read(after)
    return from === to ? [] : [{ label, from, to }]
  })
}

/** Pick the most specific action for a link edit. */
export function linkUpdateAction(changes: Change[]): 'link.updated' | 'link.moved' | 'link.tagged' {
  if (changes.length === 1 && changes[0]!.label === 'Folder') return 'link.moved'
  if (changes.length === 1 && changes[0]!.label === 'Tags') return 'link.tagged'
  return 'link.updated'
}
