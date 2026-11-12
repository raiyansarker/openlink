import { Heading } from '@astryxdesign/core/Heading'
import { Section } from '@astryxdesign/core/Section'

type DashboardSectionPlaceholderProps = {
  title: string
}

export default function DashboardSectionPlaceholder({
  title,
}: DashboardSectionPlaceholderProps) {
  return (
    <Section padding={6}>
      <Heading level={1}>{title}</Heading>
    </Section>
  )
}
