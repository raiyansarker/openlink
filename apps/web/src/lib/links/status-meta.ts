import type { ShortLinkStatus } from '#/data/demo/types'

export type LinkStatusDotVariant = 'success' | 'warning' | 'neutral'

export type LinkStatusMeta = {
  status: ShortLinkStatus
  label: string
  description: string
  dotVariant: LinkStatusDotVariant
  isPulsing: boolean
}

const STATUS_META: Record<ShortLinkStatus, LinkStatusMeta> = {
  active: {
    status: 'active',
    label: 'Live',
    description: 'Redirects are serving traffic',
    dotVariant: 'success',
    isPulsing: true,
  },
  paused: {
    status: 'paused',
    label: 'Paused',
    description: 'Redirects temporarily stopped',
    dotVariant: 'warning',
    isPulsing: false,
  },
  archived: {
    status: 'archived',
    label: 'Archived',
    description: 'Kept for history, not serving',
    dotVariant: 'neutral',
    isPulsing: false,
  },
}

export function linkStatusMeta(status: ShortLinkStatus): LinkStatusMeta {
  return STATUS_META[status] ?? STATUS_META.archived
}

/** @deprecated Prefer linkStatusMeta — kept for callers expecting badge variants */
export function linkStatusBadgeVariant(
  status: ShortLinkStatus,
): 'success' | 'warning' | 'neutral' {
  const variant = linkStatusMeta(status).dotVariant
  if (variant === 'success' || variant === 'warning') return variant
  return 'neutral'
}

export type LinkStatusBadgeVariant = ReturnType<typeof linkStatusBadgeVariant>
