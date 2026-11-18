import type { ReactNode } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

/** A titled block of the General settings page. */
export function SettingsBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      <VStack gap={0.5} hAlign="start">
        <Heading level={4} weight="bold">
          {title}
        </Heading>
        {description ? (
          <Text type="supporting" color="secondary">
            {description}
          </Text>
        ) : null}
      </VStack>
      {children}
    </VStack>
  )
}

/** A line with a title and description on the left and an action on the right. */
export function ActionRow({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <HStack hAlign="between" vAlign="center" gap={4} width="100%">
      <VStack gap={0.5} hAlign="start">
        <Text weight="semibold">{title}</Text>
        <Text type="supporting" color="secondary">
          {description}
        </Text>
      </VStack>
      {action}
    </HStack>
  )
}
