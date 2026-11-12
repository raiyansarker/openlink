import { useEffect, useMemo, useState } from 'react'
import { Card } from '@astryxdesign/core/Card'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Switch } from '@astryxdesign/core/Switch'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import HourHeatmap from '#/components/analytics/HourHeatmap'
import LocationsCard from '#/components/analytics/LocationsCard'
import MetricTiles from '#/components/analytics/MetricTiles'
import SourcesCard from '#/components/analytics/SourcesCard'
import TechnologyCard from '#/components/analytics/TechnologyCard'
import TrafficChart from '#/components/analytics/TrafficChart'
import { useOrganization } from '#/contexts/OrganizationContext'
import {
  RANGE_OPTIONS,
  buildAnalyticsReport,
  type AnalyticsRange,
  type TrackedLink,
} from '#/lib/analytics/demo-dataset'

type LinkAnalyticsSectionProps = {
  linkId: string
}

/**
 * The Analytics page's panels scoped to one short link. Numbers are tied to
 * the link's own record: nothing before it was created, and lifetime clicks
 * that match its stored count.
 */
export default function LinkAnalyticsSection({ linkId }: LinkAnalyticsSectionProps) {
  const { activeOrg, links } = useOrganization()
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [isComparing, setIsComparing] = useState(true)
  // Built after mount: demo numbers depend on "now" and the viewer's
  // timezone, so a server render would not hydrate.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
  }, [linkId])

  const link = links.find((l) => l.id === linkId)

  const trackedLinks = useMemo<TrackedLink[]>(
    () =>
      links.map((l) => ({ id: l.id, slug: l.slug, title: l.title, destination: l.targetUrl })),
    [links],
  )

  const report = useMemo(
    () =>
      now == null || !link || link.clicks <= 0
        ? null
        : buildAnalyticsReport({
            orgId: activeOrg.id,
            range,
            linkId: link.id,
            links: trackedLinks,
            now,
            calibration: {
              createdAt: new Date(link.createdAt).getTime(),
              lifetimeClicks: link.clicks,
            },
          }),
    [activeOrg.id, range, link, trackedLinks, now],
  )

  const hasClicks = (link?.clicks ?? 0) > 0

  return (
    <VStack gap={4} hAlign="stretch" width="100%">
      <HStack hAlign="between" vAlign="center" gap={3} width="100%" wrap="wrap">
        <Text weight="semibold">Analytics</Text>
        {hasClicks ? (
          <HStack gap={4} vAlign="center" wrap="wrap">
            <SegmentedControl
              label="Time range"
              value={range}
              onChange={(value) => setRange(value as AnalyticsRange)}
              size="sm"
            >
              {RANGE_OPTIONS.map((option) => (
                <SegmentedControlItem key={option.value} value={option.value} label={option.label} />
              ))}
            </SegmentedControl>
            <Switch
              size="sm"
              label="Compare"
              labelTooltip="Compare to the previous period of the same length"
              value={isComparing}
              onChange={setIsComparing}
            />
          </HStack>
        ) : null}
      </HStack>

      {!hasClicks ? (
        <Card padding={6} style={{ width: '100%' }}>
          <EmptyState
            isCompact
            headingLevel={4}
            title="No clicks yet"
            description="Share the short link. Traffic, sources, locations, and devices show up here after the first click."
          />
        </Card>
      ) : report ? (
        <VStack gap={4} hAlign="stretch" width="100%">
          <MetricTiles report={report} isComparing={isComparing} isCompact />
          <AnalyticsCard
            title="Clicks over time"
            description={`Per ${report.bucket}, stacked by channel${isComparing ? ' · dashed line is the previous period' : ''}`}
          >
            <TrafficChart report={report} isComparing={isComparing} height={240} />
          </AnalyticsCard>
          <Grid columns={{ minWidth: 300, max: 2 }} gap={4} width="100%">
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
