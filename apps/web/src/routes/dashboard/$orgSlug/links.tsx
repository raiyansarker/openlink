import { createFileRoute } from '@tanstack/react-router'
import { Heading } from '@astryxdesign/core/Heading'
import { Section } from '@astryxdesign/core/Section'

export const Route = createFileRoute('/dashboard/$orgSlug/links')({
  component: DashboardLinksPage,
})

function DashboardLinksPage() {
  return (
    <Section padding={6}>
      <Heading level={1}>Links</Heading>
    </Section>
  )
}
