import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Button } from '@astryxdesign/core/Button'
import CreateLinkChromeButton from '#/components/dashboard/CreateLinkChromeButton'
import { useNavigate } from '@tanstack/react-router'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardOrgPath } from '#/lib/dashboard/build-org-path'
import DashboardOverviewMetrics from './DashboardOverviewMetrics'
import DashboardRecentLinksTable from './DashboardRecentLinksTable'

export default function DashboardOverview() {
  const { stats, activeOrg } = useOrganization()
  const navigate = useNavigate()
  const linksPath = buildDashboardOrgPath(activeOrg.slug, 'links')

  return (
    <VStack
      gap={6}
      width="fill"
      paddingBlockStart={8}
      paddingInline={8}
      paddingBlockEnd={10}
    >
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap" width="fill">
        <Heading level={1}>Overview</Heading>
        <CreateLinkChromeButton layout="hug" />
      </HStack>

      <DashboardOverviewMetrics stats={stats} />

      <VStack gap={4} width="fill">
        <HStack hAlign="between" vAlign="center" gap={4} width="fill" wrap="wrap">
          <Heading level={3}>
            Recent links
          </Heading>
          <Button
            variant="ghost"
            label="View all"
            onClick={() => void navigate({ to: linksPath })}
          />
        </HStack>
        <DashboardRecentLinksTable />
      </VStack>
    </VStack>
  )
}
