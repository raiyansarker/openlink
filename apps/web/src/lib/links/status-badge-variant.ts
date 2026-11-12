import type { ShortLinkStatus } from '#/data/demo/types'

export type LinkStatusBadgeVariant = 'success' | 'warning' | 'neutral'

export function linkStatusBadgeVariant(
  status: ShortLinkStatus,
): LinkStatusBadgeVariant {
  if (status === 'active') {
    return 'success'
  }
  if (status === 'paused') {
    return 'warning'
  }
  return 'neutral'
}
