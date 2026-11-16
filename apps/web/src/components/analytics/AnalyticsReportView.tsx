import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Grid } from '@astryxdesign/core/Grid'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import DestinationsCard from '#/components/analytics/DestinationsCard'
import HourHeatmap from '#/components/analytics/HourHeatmap'
import LocationsCard from '#/components/analytics/LocationsCard'
import MetricTiles from '#/components/analytics/MetricTiles'
import RecentClicksCard from '#/components/analytics/RecentClicksCard'
import RhythmCard from '#/components/analytics/RhythmCard'
import SourcesCard from '#/components/analytics/SourcesCard'
import TechnologyCard from '#/components/analytics/TechnologyCard'
import TopLinksCard from '#/components/analytics/TopLinksCard'
import TrafficChart, { trafficSummary, type TrafficView } from '#/components/analytics/TrafficChart'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import { AnalyticsReportMapper, type AnalyticsReport } from '#/lib/analytics/report'
import { ApiError } from '#/lib/api/error'

type AnalyticsReportViewProps = {
  organizationId: string
  /** One link, or null for the whole workspace. */
  linkId: string | null
  report: AnalyticsReport | undefined
  isLoading: boolean
  error: unknown
  onRetry: () => void
  isComparing: boolean
  /** One link: hides the rankings that would be a single row. */
  isSingleLink?: boolean
  /** Workspace view: picking a top link drills into it. */
  onSelectLink?: (linkId: string) => void
  chartHeight?: number
  trafficView: TrafficView
  onTrafficViewChange: (view: TrafficView) => void
  /** The live "Recent clicks" list; off for reports about a past period. */
  showRecentClicks?: boolean
}

/** Every analytics panel for one report, with loading, error and no-clicks states. */
export default function AnalyticsReportView({
  organizationId,
  linkId,
  report,
  isLoading,
  error,
  onRetry,
  isComparing,
  isSingleLink = false,
  onSelectLink,
  chartHeight,
  trafficView,
  onTrafficViewChange,
  showRecentClicks = true,
}: AnalyticsReportViewProps) {
  if (error && !report) {
    return (
      <Banner
        status="error"
        title={ApiError.message(error, 'Analytics could not be loaded.')}
        endContent={<Button variant="secondary" size="sm" label="Try again" onClick={onRetry} />}
      />
    )
  }
  if (isLoading || !report) return <AnalyticsSkeleton />
  if (AnalyticsReportMapper.isEmpty(report)) {
    return (
      <Card padding={8}>
        <EmptyState
          icon={<EmptyLinksIllustration width={180} />}
          title="No clicks in this period"
          description={
            isSingleLink
              ? 'Clicks on this link appear here within seconds. Share it, or try a longer period.'
              : 'Clicks on your short links appear here within seconds. Share a link, or try a longer period.'
          }
        />
      </Card>
    )
  }

  return (
    <VStack gap={5} hAlign="stretch" width="fill">
      <MetricTiles report={report} isComparing={isComparing} isSingleLink={isSingleLink} />

      <AnalyticsCard
        title="Clicks over time"
        description={trafficSummary(report)}
        actions={
          <SegmentedControl
            label="Chart view"
            size="sm"
            value={trafficView}
            onChange={(value) => onTrafficViewChange(value as TrafficView)}
          >
            <SegmentedControlItem value="total" label="Total" />
            <SegmentedControlItem value="channels" label="By channel" />
          </SegmentedControl>
        }
      >
        <TrafficChart report={report} isComparing={isComparing} view={trafficView} {...(chartHeight ? { height: chartHeight } : {})} />
      </AnalyticsCard>

      <Grid columns={{ minWidth: 360, max: 2 }} gap={5} width="100%">
        {isSingleLink ? null : <TopLinksCard rows={report.links} isComparing={isComparing} {...(onSelectLink ? { onSelect: onSelectLink } : {})} />}
        {isSingleLink ? null : <DestinationsCard rows={report.destinations} isComparing={isComparing} />}
        <SourcesCard report={report} isComparing={isComparing} />
        <TechnologyCard report={report} isComparing={isComparing} />
      </Grid>

      <LocationsCard report={report} isComparing={isComparing} />

      <Grid columns={{ minWidth: 360, max: 2 }} gap={5} width="100%">
        <RhythmCard report={report} />
        <AnalyticsCard
          title="When people click"
          description={`${report.heatmapWindowLabel} · by weekday and hour, in your timezone`}
        >
          <HourHeatmap report={report} />
        </AnalyticsCard>
      </Grid>

      {showRecentClicks ? <RecentClicksCard organizationId={organizationId} linkId={linkId} /> : null}
    </VStack>
  )
}

/** The shape of the page while the first report loads, so nothing jumps when it arrives. */
function AnalyticsSkeleton() {
  return (
    <VStack gap={5} hAlign="stretch" width="fill" aria-busy="true" aria-label="Loading analytics">
      <Grid columns={{ minWidth: 220, max: 4 }} gap={4} width="100%">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} index={index} height={158} radius={3} />
        ))}
      </Grid>
      <Skeleton index={4} height={360} radius={3} />
      <Grid columns={{ minWidth: 360, max: 2 }} gap={5} width="100%">
        <Skeleton index={5} height={300} radius={3} />
        <Skeleton index={6} height={300} radius={3} />
      </Grid>
    </VStack>
  )
}
