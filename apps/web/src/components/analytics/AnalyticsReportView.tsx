import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Grid } from '@astryxdesign/core/Grid'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import DestinationsCard from '#/components/analytics/DestinationsCard'
import HourHeatmap from '#/components/analytics/HourHeatmap'
import LocationsCard from '#/components/analytics/LocationsCard'
import MetricTiles from '#/components/analytics/MetricTiles'
import SourcesCard from '#/components/analytics/SourcesCard'
import TechnologyCard from '#/components/analytics/TechnologyCard'
import TopLinksCard from '#/components/analytics/TopLinksCard'
import TrafficChart from '#/components/analytics/TrafficChart'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import { AnalyticsReportMapper, type AnalyticsReport } from '#/lib/analytics/report'
import { ApiError } from '#/lib/api/error'

type AnalyticsReportViewProps = {
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
}

/** Every analytics panel for one report, with loading, error and no-clicks states. */
export default function AnalyticsReportView({
  report,
  isLoading,
  error,
  onRetry,
  isComparing,
  isSingleLink = false,
  onSelectLink,
  chartHeight,
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
        description={`Per ${report.bucket}, stacked by channel${isComparing ? ' · dashed line is the previous period' : ''}`}
      >
        <TrafficChart report={report} isComparing={isComparing} {...(chartHeight ? { height: chartHeight } : {})} />
      </AnalyticsCard>

      <Grid columns={{ minWidth: 360, max: 2 }} gap={5} width="100%">
        {isSingleLink ? null : <TopLinksCard rows={report.links} isComparing={isComparing} onSelect={onSelectLink ?? (() => {})} />}
        {isSingleLink ? null : <DestinationsCard rows={report.destinations} isComparing={isComparing} />}
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
