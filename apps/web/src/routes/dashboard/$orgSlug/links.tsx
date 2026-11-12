import { createFileRoute } from '@tanstack/react-router'
import { Heading } from '@astryxdesign/core/Heading'
import { Section } from '@astryxdesign/core/Section'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/links')({
  head: createPageHead('Links'),
  component: DashboardLinksPage,
})

function DashboardLinksPage() {
  return (
    <Section padding={6}>
      <Heading level={1}>Links</Heading>
    </Section>
  )
}
