import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Section } from '@astryxdesign/core/Section'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'

export const Route = createFileRoute('/dashboard/links')({
  component: LinksPlaceholder,
})

function LinksPlaceholder() {
  return (
    <Section>
      <Stack gap={3}>
        <EmptyState
          title="Links manager"
          description="The full links table and bulk actions will live here. For now, use Overview to browse demo short links."
          actions={<Button label="Back to overview" variant="primary" href="/dashboard" />}
        />
        <Text type="supporting" color="secondary" size="sm">
          Placeholder route — wired for sidebar navigation.
        </Text>
      </Stack>
    </Section>
  )
}
