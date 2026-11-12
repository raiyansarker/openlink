import type { ReactNode } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

type AnalyticsCardProps = {
  title: string
  description?: string
  /** Controls on the right of the header (toggles, selectors). */
  actions?: ReactNode
  children: ReactNode
}

/** One analytics panel: title row, optional controls, then the content. */
export default function AnalyticsCard({
  title,
  description,
  actions,
  children,
}: AnalyticsCardProps) {
  return (
    <Card padding={5} style={{ width: '100%', minWidth: 0 }}>
      <VStack gap={4} hAlign="stretch" width="100%">
        <HStack hAlign="between" vAlign="start" gap={3} width="100%" wrap="wrap">
          <VStack gap={0.5} hAlign="start">
            <Text weight="semibold">{title}</Text>
            {description ? (
              <Text type="supporting" color="secondary">
                {description}
              </Text>
            ) : null}
          </VStack>
          {actions}
        </HStack>
        {children}
      </VStack>
    </Card>
  )
}
