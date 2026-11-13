import { demoCurrentUser } from '#/data/demo/current-user'
import type {
  LinkFolder,
  LinkHistoryChange,
  LinkHistoryEvent,
  ShortLink,
} from '#/data/demo/types'
import { folderPathLabel } from '#/lib/links/folder-tree'
import { holdPageMeta } from '#/lib/links/hold-pages'

export function historyEvent(
  type: LinkHistoryEvent['type'],
  summary: string,
  changes?: LinkHistoryChange[],
  now = new Date(),
  excerpt?: string,
): LinkHistoryEvent {
  return {
    id: `evt_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
    at: now.toISOString(),
    actor: demoCurrentUser.name,
    type,
    summary,
    ...(changes && changes.length > 0 ? { changes } : {}),
    ...(excerpt ? { excerpt } : {}),
  }
}

/**
 * Newest first, capped so a busy link doesn't grow forever. `touch: false`
 * records activity (a comment, a health check) without counting it as an
 * edit, so "Last updated" stays put.
 */
export function withEvent(
  link: ShortLink,
  event: LinkHistoryEvent,
  { touch = true }: { touch?: boolean } = {},
): ShortLink {
  return {
    ...link,
    ...(touch ? { updatedAt: event.at } : {}),
    history: [event, ...(link.history ?? [])].slice(0, 100),
  }
}

/** Longest comment a link accepts. */
export const COMMENT_MAX_LENGTH = 2000

/** One line of a comment, trimmed for the history timeline. */
export function commentExcerpt(body: string, max = 140): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function fmtDate(iso: string | undefined) {
  return iso ? dateFormatter.format(new Date(iso)) : 'None'
}

function onOff(value: unknown) {
  return value ? 'On' : 'Off'
}

/**
 * Field-level differences between two versions of a link, labelled for
 * people (not field names). Secrets are never shown — only "changed".
 */
export function diffLinks(
  before: ShortLink,
  after: ShortLink,
  folders: LinkFolder[],
): LinkHistoryChange[] {
  const changes: LinkHistoryChange[] = []
  const add = (label: string, from: string, to: string) => {
    if (from !== to) changes.push({ label, from, to })
  }
  const json = (v: unknown) => JSON.stringify(v ?? null)

  add('Destination', before.destinationUrl ?? before.targetUrl, after.destinationUrl ?? after.targetUrl)
  add('Title', before.title, after.title)
  add('Notes', before.description ?? '', after.description ?? '')
  add(
    'Folder',
    folderPathLabel(folders, before.folderId ?? null),
    folderPathLabel(folders, after.folderId ?? null),
  )
  add('Tags', before.tags.map((t) => `#${t}`).join(' ') || 'None', after.tags.map((t) => `#${t}`).join(' ') || 'None')
  add('Redirect', String(before.redirectStatus ?? 302), String(after.redirectStatus ?? 302))
  add('Starts', fmtDate(before.activateAt), fmtDate(after.activateAt))
  add('Expires', fmtDate(before.expiresAt), fmtDate(after.expiresAt))
  add('Click limit', before.maxClicks ? String(before.maxClicks) : 'None', after.maxClicks ? String(after.maxClicks) : 'None')
  add('After expiry', before.expiredDestinationUrl ?? 'None', after.expiredDestinationUrl ?? 'None')
  add('Fallback URL', before.fallbackDestinationUrl ?? 'None', after.fallbackDestinationUrl ?? 'None')
  add('Password', onOff(before.passwordProtected), onOff(after.passwordProtected))
  add('Cloaking', onOff(before.cloaked), onOff(after.cloaked))
  if (json(before.utm) !== json(after.utm)) add('UTM parameters', before.utm ? 'Set' : 'None', after.utm ? 'Updated' : 'None')
  if (json(before.socialPreview) !== json(after.socialPreview)) add('Social preview', before.socialPreview ? 'Custom' : 'Default', after.socialPreview ? (before.socialPreview ? 'Updated' : 'Custom') : 'Default')
  if (json(before.targeting) !== json(after.targeting)) add('Targeting', before.targeting ? 'On' : 'Off', after.targeting ? (before.targeting ? 'Updated' : 'On') : 'Off')
  if (json(before.metadata) !== json(after.metadata)) add('Metadata', `${Object.keys(before.metadata ?? {}).length} fields`, `${Object.keys(after.metadata ?? {}).length} fields`)
  add(
    'Hold mode',
    before.hold ? holdPageMeta(before.hold.page).label : 'Off',
    after.hold ? holdPageMeta(after.hold.page).label : 'Off',
  )
  return changes
}
