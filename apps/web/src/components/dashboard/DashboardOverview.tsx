import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
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
  const analyticsPath = buildDashboardOrgPath(activeOrg.slug, 'analytics')

  return (
    <VStack
      gap={10}
      width="fill"
      paddingBlockStart={8}
      paddingInline={8}
      paddingBlockEnd={10}
    >
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap" width="fill">
        <VStack gap={2}>
          <Heading level={1}>Overview</Heading>
          <Text color="secondary">
            A snapshot of your links and the people they reach.
          </Text>
        </VStack>
        <CreateLinkChromeButton layout="hug" />
      </HStack>

      <VStack
        as="section"
        gap={4}
        width="fill"
        aria-labelledby="overview-performance"
      >
        <HStack hAlign="between" vAlign="center" gap={4} width="fill" wrap="wrap">
          <Heading level={2} id="overview-performance">
            Performance
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            label="View analytics"
            href={analyticsPath}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              void navigate({ to: analyticsPath })
            }}
          />
        </HStack>
        <DashboardOverviewMetrics stats={stats} />
      </VStack>

      <VStack
        as="section"
        gap={5}
        width="fill"
        aria-labelledby="overview-recent-links"
      >
        <HStack hAlign="between" vAlign="center" gap={4} width="fill" wrap="wrap">
          <VStack gap={1}>
            <Heading level={2} id="overview-recent-links">
              Recent links
            </Heading>
            <Text type="supporting" color="secondary">
              Your latest short links, newest first.
            </Text>
          </VStack>
          <Button
            variant="ghost"
            size="sm"
            label="View all links"
            href={linksPath}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              void navigate({ to: linksPath })
            }}
          />
        </HStack>
        <DashboardRecentLinksTable />
      </VStack>
    </VStack>
  )
}
