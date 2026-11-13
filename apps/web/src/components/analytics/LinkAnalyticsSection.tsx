import { useEffect, useMemo, useState } from 'react'
import { Grid } from '@astryxdesign/core/Grid'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import AnalyticsToolbar from '#/components/analytics/AnalyticsToolbar'
import HourHeatmap from '#/components/analytics/HourHeatmap'
import LocationsCard from '#/components/analytics/LocationsCard'
import MetricTiles from '#/components/analytics/MetricTiles'
import SourcesCard from '#/components/analytics/SourcesCard'
import TechnologyCard from '#/components/analytics/TechnologyCard'
import TrafficChart from '#/components/analytics/TrafficChart'
import { useOrganization } from '#/contexts/OrganizationContext'
import {
  buildAnalyticsReport,
  type AnalyticsRange,
  type TrackedLink,
} from '#/lib/analytics/demo-dataset'
import { formatReportWindow } from '#/lib/analytics/format'

type LinkAnalyticsSectionProps = {
  linkId: string
}

/**
 * The Analytics (Insights) page scoped to one short link: the same toolbar,
 * KPI tiles and panels, minus the org-wide rankings (top links,
 * destinations) that would be a single row here.
 *
 * A link with recorded clicks is calibrated to its own record: nothing before
 * it was created, and lifetime clicks that match its stored count. A link with
 * none yet shows the demo traffic Insights shows when drilling into it, so the
 * two pages always agree.
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
  const hasRecordedClicks = (link?.clicks ?? 0) > 0

  // Same list (and order) as Insights, so a link's share matches there.
  const trackedLinks = useMemo<TrackedLink[]>(
    () =>
      links.map((l) => ({ id: l.id, slug: l.slug, title: l.title, destination: l.targetUrl })),
    [links],
  )

  const report = useMemo(
    () =>
      now == null || !link
        ? null
        : buildAnalyticsReport({
            orgId: activeOrg.id,
            range,
            linkId: link.id,
            links: trackedLinks,
            now,
            calibration: hasRecordedClicks
              ? {
                  createdAt: new Date(link.createdAt).getTime(),
                  lifetimeClicks: link.clicks,
                }
              : undefined,
          }),
    [activeOrg.id, range, link, hasRecordedClicks, trackedLinks, now],
  )

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <VStack gap={2} hAlign="stretch" width="100%">
        <AnalyticsToolbar
          range={range}
          onRangeChange={setRange}
          isComparing={isComparing}
          onCompareChange={setIsComparing}
        />
        {report ? (
          <Text type="supporting" color="secondary">
            {formatReportWindow(report)}
            {hasRecordedClicks
              ? ''
              : ' · No clicks recorded yet, so this shows sample traffic (the same as Insights)'}
          </Text>
        ) : null}
      </VStack>

      {report ? (
        <>
          <MetricTiles report={report} isComparing={isComparing} isSingleLink />

          <AnalyticsCard
            title="Clicks over time"
            description={`Per ${report.bucket}, stacked by channel${isComparing ? ' · dashed line is the previous period' : ''}`}
          >
            <TrafficChart report={report} isComparing={isComparing} height={280} />
          </AnalyticsCard>

          <Grid columns={{ minWidth: 360, max: 2 }} gap={5} width="100%">
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
        </>
      ) : null}
    </VStack>
  )
}
