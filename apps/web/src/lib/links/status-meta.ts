import type { LinkStatus } from '#/lib/api/types'

export type LinkStatusMeta = {
  label: string
  description: string
}

/** One label and description per API status. */
const STATUS_META: Record<LinkStatus, LinkStatusMeta> = {
  draft: { label: 'Draft', description: 'Saved but not redirecting yet' },
  scheduled: { label: 'Scheduled', description: 'Starts redirecting at its activation time' },
  active: { label: 'Live', description: 'Redirects are serving traffic' },
  paused: { label: 'Paused', description: 'Redirects temporarily stopped' },
  expired: { label: 'Expired', description: 'Past its expiry date or click limit' },
  disabled: { label: 'Disabled', description: 'Turned off, not serving' },
}

export function linkStatusMeta(status: LinkStatus): LinkStatusMeta {
  return STATUS_META[status]
}
