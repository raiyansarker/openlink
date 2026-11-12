import { Section } from '@astryxdesign/core/Section'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

type DashboardSectionPlaceholderProps = {
  title: string
  description: string
}

export default function DashboardSectionPlaceholder({
  title,
  description,
}: DashboardSectionPlaceholderProps) {
  return (
    <Section padding={6}>
      <VStack gap={2}>
        <Heading level={2}>{title}</Heading>
        <Text color="secondary">{description}</Text>
      </VStack>
    </Section>
  )
}
