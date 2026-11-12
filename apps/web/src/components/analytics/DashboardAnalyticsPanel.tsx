import { useEffect, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Grid, GridSpan } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import AnalyticsToolbar, { ALL_LINKS } from '#/components/analytics/AnalyticsToolbar'
import DestinationsCard from '#/components/analytics/DestinationsCard'
import HourHeatmap from '#/components/analytics/HourHeatmap'
import LocationsCard from '#/components/analytics/LocationsCard'
import MetricTiles from '#/components/analytics/MetricTiles'
import MoversCard from '#/components/analytics/MoversCard'
import SourcesCard from '#/components/analytics/SourcesCard'
import TechnologyCard from '#/components/analytics/TechnologyCard'
import TopLinksTable from '#/components/analytics/TopLinksTable'
import TrafficChart from '#/components/analytics/TrafficChart'
import { useOrganization } from '#/contexts/OrganizationContext'
import {
  SAMPLE_LINKS,
  buildAnalyticsReport,
  type AnalyticsRange,
  type AnalyticsReport,
  type TrackedLink,
} from '#/lib/analytics/demo-dataset'

function windowLabel(report: AnalyticsReport): string {
  const opts: Intl.DateTimeFormatOptions =
    report.range === '24h'
      ? { weekday: 'short', hour: 'numeric' }
      : { month: 'short', day: 'numeric' }
  return `${report.windowStart.toLocaleString(undefined, opts)} – ${report.windowEnd.toLocaleString(undefined, opts)}`
}

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

      <AnalyticsToolbar
        range={range}
        onRangeChange={setRange}
        linkId={linkId}
        onLinkChange={setLinkId}
        links={trackedLinks}
        isComparing={isComparing}
        onCompareChange={setIsComparing}
      />

      {report ? (
        <VStack gap={5} hAlign="stretch" width="fill">
          <MetricTiles report={report} isComparing={isComparing} />

          <Grid columns={{ minWidth: 300, max: 3 }} gap={5} width="100%">
            <GridSpan columns={selectedLink ? 'full' : 2}>
              <AnalyticsCard
                title="Clicks over time"
                description={`Per ${report.bucket}, stacked by channel${isComparing ? ' · dashed line is the previous period' : ''}`}
              >
                <TrafficChart report={report} isComparing={isComparing} height={380} />
              </AnalyticsCard>
            </GridSpan>
            {selectedLink ? null : (
              <MoversCard movers={report.movers} onSelect={drillInto} />
            )}
          </Grid>

          <AnalyticsCard
            title={selectedLink ? 'This link' : 'Top short links'}
            description={
              selectedLink
                ? undefined
                : `Ranked by clicks · ${report.links.length} links · select one to drill in`
            }
            actions={
              selectedLink ? (
                <Button
                  variant="secondary"
                  size="sm"
                  label="Show all links"
                  onClick={() => setLinkId(ALL_LINKS)}
                />
              ) : undefined
            }
          >
            <TopLinksTable rows={report.links} isComparing={isComparing} onSelect={drillInto} />
          </AnalyticsCard>

          <Grid columns={{ minWidth: 360, max: 2 }} gap={5} width="100%">
            <DestinationsCard rows={report.destinations} isComparing={isComparing} />
            <SourcesCard report={report} isComparing={isComparing} />
          </Grid>

          <LocationsCard report={report} isComparing={isComparing} />

          <Grid columns={{ minWidth: 360, max: 2 }} gap={5} width="100%">
            <TechnologyCard report={report} isComparing={isComparing} />
            <AnalyticsCard
              title="When people click"
              description={`${report.heatmapWindowLabel} · by weekday and hour, in your timezone`}
            >
              <HourHeatmap report={report} />
            </AnalyticsCard>
          </Grid>

          <HStack>
            <Text type="supporting" color="secondary">
              Demo data. Numbers are generated for this workspace and will be replaced by live
              click events.
            </Text>
          </HStack>
        </VStack>
      ) : null}
    </VStack>
  )
}
