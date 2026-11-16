import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

/** Title (and optional description) at the top of a settings page. */
export default function SettingsPageHeader({ title, description }: { title: string; description?: string }) {
  if (!description) return <Heading level={3}>{title}</Heading>
  return (
    <VStack gap={1} hAlign="start" width="fill">
      <Heading level={3}>{title}</Heading>
      <Text color="secondary" type="supporting">
        {description}
      </Text>
    </VStack>
  )
}
