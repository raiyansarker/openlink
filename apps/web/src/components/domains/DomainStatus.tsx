import { Text } from '@astryxdesign/core/Text'
import type { DomainReadiness } from '#/data/demo/domains'
import { domainStatusMeta } from '#/lib/domains/domain-status-meta'

type DomainStatusProps = {
  readiness: DomainReadiness
}

/** Neutral status copy — no success/warning badge colors. */
export default function DomainStatus({ readiness }: DomainStatusProps) {
  const meta = domainStatusMeta(readiness)

  return (
    <Text type="supporting" color="secondary">
      {meta.label}
    </Text>
  )
}
