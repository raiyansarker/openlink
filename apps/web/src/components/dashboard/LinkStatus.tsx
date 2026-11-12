import { Badge } from '@astryxdesign/core/Badge'
import { HStack } from '@astryxdesign/core/HStack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import type { ShortLinkStatus } from '#/data/demo/types'
import { linkStatusMeta } from '#/lib/links/status-meta'

type LinkStatusProps = {
  status: ShortLinkStatus
}

export default function LinkStatus({ status }: LinkStatusProps) {
  const meta = linkStatusMeta(status)

  return (
    <HStack gap={2} vAlign="center">
      <StatusDot
        variant={meta.dotVariant}
        isPulsing={meta.isPulsing}
        label={meta.description}
      />
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
    </HStack>
  )
}
