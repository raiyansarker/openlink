import { useEffect, useMemo, useState } from 'react'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import AnalyticsToolbar, { ALL_LINKS } from '#/components/analytics/AnalyticsToolbar'
import DestinationsCard from '#/components/analytics/DestinationsCard'
import HourHeatmap from '#/components/analytics/HourHeatmap'
import LocationsCard from '#/components/analytics/LocationsCard'
import MetricTiles from '#/components/analytics/MetricTiles'
import SourcesCard from '#/components/analytics/SourcesCard'
import TopLinksCard from '#/components/analytics/TopLinksCard'
import TechnologyCard from '#/components/analytics/TechnologyCard'
import TrafficChart from '#/components/analytics/TrafficChart'
import { useOrganization } from '#/contexts/OrganizationContext'
import {
  SAMPLE_LINKS,
  buildAnalyticsReport,
  type AnalyticsRange,
  type TrackedLink,
} from '#/lib/analytics/demo-dataset'
import { formatReportWindow as windowLabel } from '#/lib/analytics/format'

export default function DashboardAnalyticsPanel() {
  const { activeOrg, links } = useOrganization()
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [linkId, setLinkId] = useState<string>(ALL_LINKS)
  const [isComparing, setIsComparing] = useState(true)
  // Built after mount: demo numbers depend on "now" and the viewer's
  // timezone, so a server render would not hydrate.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    setLinkId(ALL_LINKS)
  }, [activeOrg.id])

  const trackedLinks = useMemo<TrackedLink[]>(
    () =>
      links.length > 0
        ? links.map((link) => ({
            id: link.id,
            slug: link.slug,
            title: link.title,
            destination: link.targetUrl,
          }))
        : SAMPLE_LINKS,
    [links],
  )

  const selectedLink = trackedLinks.find((link) => link.id === linkId) ?? null

  const report = useMemo(
    () =>
      now == null
        ? null
        : buildAnalyticsReport({
            orgId: activeOrg.id,
            range,
            linkId: selectedLink?.id ?? null,
            links: trackedLinks,
            now,
          }),
    [activeOrg.id, range, selectedLink, trackedLinks, now],
  )

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
          <Link color="accent" onClick={() => setLinkId(ALL_LINKS)}>
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

      {report ? (
        <VStack gap={5} hAlign="stretch" width="fill">
          <MetricTiles report={report} isComparing={isComparing} />

          <AnalyticsCard
            title="Clicks over time"
            description={`Per ${report.bucket}, stacked by channel${isComparing ? ' · dashed line is the previous period' : ''}`}
          >
            <TrafficChart report={report} isComparing={isComparing} />
          </AnalyticsCard>

          <Grid columns={{ minWidth: 360, max: 2 }} gap={5} width="100%">
            {/* One link drills in, so its own ranking and destination would be a single row each. */}
            {selectedLink ? null : (
              <TopLinksCard rows={report.links} isComparing={isComparing} onSelect={drillInto} />
            )}
            {selectedLink ? null : (
              <DestinationsCard rows={report.destinations} isComparing={isComparing} />
            )}
            <SourcesCard report={report} isComparing={isComparing} />
            <TechnologyCard report={report} isComparing={isComparing} />
          </Grid>

          <LocationsCard report={report} isComparing={isComparing} />

          <AnalyticsCard
            title="When people click"
            description={`${report.heatmapWindowLabel} · by weekday and hour, in your timezone`}
          >
            <HourHeatmap report={report} />
          </AnalyticsCard>
        </VStack>
      ) : null}
    </VStack>
  )
}
