import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Section } from '@astryxdesign/core/Section'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { dashboardPaths } from '#/lib/dashboard/route-paths'

type DashboardComingSoonProps = {
  title: string
  description: string
}

export default function DashboardComingSoon({
  title,
  description,
}: DashboardComingSoonProps) {
  return (
    <Section>
      <Stack gap={3}>
        <EmptyState
          title={title}
          description={description}
          actions={
            <Button
              label="Back to overview"
              variant="primary"
              href={dashboardPaths.root}
            />
          }
        />
        <Text type="supporting" color="secondary" size="sm">
          Demo route — API wiring comes later.
        </Text>
      </Stack>
    </Section>
  )
}
