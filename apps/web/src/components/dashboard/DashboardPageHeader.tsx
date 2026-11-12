import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { Icon } from '@astryxdesign/core/Icon'

type DashboardPageHeaderProps = {
  title: string
  subtitle?: string
  showCreate?: boolean
  onCreateClick?: () => void
}

export default function DashboardPageHeader({
  title,
  subtitle,
  showCreate = true,
  onCreateClick,
}: DashboardPageHeaderProps) {
  return (
    <HStack hAlign="between" vAlign="start" gap={4}>
      <VStack gap={1}>
        <Heading level={2}>{title}</Heading>
        {subtitle ? <Text color="secondary">{subtitle}</Text> : null}
      </VStack>
      {showCreate ? (
        <Button
          variant="primary"
          label="Create link"
          icon={<Icon icon="upload" size="sm" />}
          onClick={onCreateClick}
        />
      ) : null}
    </HStack>
  )
}
