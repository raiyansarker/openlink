import { useEffect, useState } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsReportView from '#/components/analytics/AnalyticsReportView'
import AnalyticsToolbar from '#/components/analytics/AnalyticsToolbar'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useAnalyticsReport } from '#/hooks/use-analytics'
import type { AnalyticsRange } from '#/lib/analytics/report'
import { formatReportWindow as windowLabel } from '#/lib/analytics/format'

/** Workspace analytics from recorded clicks; selecting a top link drills into it. */
export default function DashboardAnalyticsPanel() {
  const { activeOrg, links } = useOrganization()
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [linkId, setLinkId] = useState<string | null>(null)
  const [isComparing, setIsComparing] = useState(true)
  const query = useAnalyticsReport(activeOrg.id, range, linkId)
  const report = query.data

  useEffect(() => setLinkId(null), [activeOrg.id])

  const selected = linkId ? links.find((link) => link.id === linkId) ?? null : null
  const selectedLink = selected ? { slug: selected.slug, destination: selected.targetUrl } : null

  const drillInto = (id: string) => {
    setLinkId(id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <VStack
      gap={6}
      hAlign="stretch"
      width="fill"
      paddingBlockStart={8}
      paddingInline={8}
      paddingBlockEnd={10}
    >
      <VStack gap={2} hAlign="start" width="fill">
        <Heading level={1}>Analytics</Heading>
        <Text color="secondary" type="supporting">
          {selectedLink
            ? `/${selectedLink.slug} → ${selectedLink.destination}`
            : `How people reach and use ${activeOrg.name}'s short links`}
          {report ? ` · ${windowLabel(report)}` : ''}
        </Text>
      </VStack>

      {selectedLink ? (
        <HStack gap={2} vAlign="center">
          <Text type="supporting" color="secondary">
            Showing one link.
          </Text>
          <Link color="accent" onClick={() => setLinkId(null)}>
            Show all links
          </Link>
        </HStack>
      ) : null}

      <AnalyticsToolbar
        range={range}
        onRangeChange={setRange}
        isComparing={isComparing}
        onCompareChange={setIsComparing}
      />

      <AnalyticsReportView
        report={report}
        isLoading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        isComparing={isComparing}
        isSingleLink={linkId != null}
        onSelectLink={drillInto}
      />
    </VStack>
  )
}
