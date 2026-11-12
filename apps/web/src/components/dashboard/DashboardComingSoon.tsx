import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { dashboardPaths } from '#/lib/dashboard/route-paths'
import DashboardPageHeader from './DashboardPageHeader'

type DashboardComingSoonProps = {
  title: string
  description: string
}

export default function DashboardComingSoon({
  title,
  description,
}: DashboardComingSoonProps) {
  return (
    <Stack gap={4}>
      <DashboardPageHeader title={title} subtitle={description} />
      <Card variant="muted" padding={4}>
        <Stack gap={2}>
          <Text type="body">This area is a layout placeholder until APIs ship.</Text>
          <Button
            label="Back to overview"
            variant="secondary"
            href={dashboardPaths.root}
          />
        </Stack>
      </Card>
    </Stack>
  )
}
