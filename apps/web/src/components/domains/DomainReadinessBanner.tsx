import { HStack } from '@astryxdesign/core/HStack'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { DomainReadiness } from '#/data/demo/domains'
import { domainStatusMeta } from '#/lib/domains/domain-status-meta'

type DomainReadinessBannerProps = {
  readiness: DomainReadiness
}

/** Quiet inline status: a dot, a label and one line of guidance. */
export default function DomainReadinessBanner({
  readiness,
}: DomainReadinessBannerProps) {
  if (readiness === 'active') return null

  const meta = domainStatusMeta(readiness)

  return (
    <VStack gap={1} width="100%" hAlign="stretch">
      <HStack gap={2} vAlign="center">
        <StatusDot
          variant={meta.dotVariant}
          label={meta.label}
          isPulsing={readiness === 'verifying'}
        />
        <Text weight="semibold">{meta.label}</Text>
      </HStack>
      <Text type="supporting" color="secondary">
        {meta.description}
      </Text>
    </VStack>
  )
}
