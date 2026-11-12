import { Badge } from '@astryxdesign/core/Badge'
import type { ShortLinkStatus } from '#/data/demo/types'
import { linkStatusMeta } from '#/lib/links/status-meta'

type LinkStatusProps = {
  status: ShortLinkStatus
}

export default function LinkStatus({ status }: LinkStatusProps) {
  const meta = linkStatusMeta(status)

  return (
    <Badge
      variant={
        meta.dotVariant === 'success'
          ? 'success'
          : meta.dotVariant === 'warning'
            ? 'warning'
            : 'neutral'
      }
      label={meta.label}
    />
  )
}
