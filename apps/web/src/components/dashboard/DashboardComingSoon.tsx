import { Button } from '@astryxdesign/core/Button'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardOrgPath } from '#/lib/dashboard/build-org-path'
import DashboardPageHeader from './DashboardPageHeader'

type DashboardComingSoonProps = {
  title: string
  description: string
}

export default function DashboardComingSoon({
  title,
  description,
}: DashboardComingSoonProps) {
  const { activeOrgId } = useOrganization()

  return (
    <Stack gap={4}>
      <DashboardPageHeader title={title} subtitle={description} />
      <section className="openlink-detail-panel">
        <div className="openlink-detail-panel__body" style={{ padding: '1.25rem' }}>
          <Stack gap={2}>
            <Text type="body">This area is a layout placeholder until APIs ship.</Text>
            <Button
              label="Back to overview"
              variant="secondary"
              href={buildDashboardOrgPath(activeOrgId)}
            />
          </Stack>
        </div>
      </section>
    </Stack>
  )
}
