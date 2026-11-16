import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsReportView from '#/components/analytics/AnalyticsReportView'
import AnalyticsToolbar from '#/components/analytics/AnalyticsToolbar'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useAnalyticsReport } from '#/hooks/use-analytics'
import type { AnalyticsView } from '#/lib/analytics/search'
import { formatReportWindow } from '#/lib/analytics/format'

type LinkAnalyticsSectionProps = {
  linkId: string
  /** Period, comparison and chart view, kept in the URL by the route. */
  view: AnalyticsView
  onViewChange: (change: Partial<AnalyticsView>) => void
}

/**
 * The Analytics page scoped to one short link: the same toolbar, tiles and
 * panels, minus the workspace rankings that would be a single row here.
 */
export default function LinkAnalyticsSection({ linkId, view, onViewChange }: LinkAnalyticsSectionProps) {
  const { activeOrg } = useOrganization()
  const { range, isComparing } = view
  const query = useAnalyticsReport(activeOrg.id, range, linkId)
  const report = query.data

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <VStack gap={2} hAlign="stretch" width="100%">
        <AnalyticsToolbar
          range={range}
          onRangeChange={(next) => onViewChange({ range: next })}
          isComparing={isComparing}
          onCompareChange={(next) => onViewChange({ isComparing: next })}
        />
        {report ? (
          <Text type="supporting" color="secondary">
            {formatReportWindow(report)}
          </Text>
        ) : null}
      </VStack>

      <AnalyticsReportView
        organizationId={activeOrg.id}
        linkId={linkId}
        report={report}
        isLoading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        isComparing={isComparing}
        isSingleLink
        chartHeight={280}
        trafficView={view.trafficView}
        onTrafficViewChange={(next) => onViewChange({ trafficView: next })}
      />
    </VStack>
  )
}
