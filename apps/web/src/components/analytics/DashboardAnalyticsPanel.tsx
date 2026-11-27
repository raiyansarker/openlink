import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Link } from '@astryxdesign/core/Link'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsReportView from '#/components/analytics/AnalyticsReportView'
import AnalyticsToolbar from '#/components/analytics/AnalyticsToolbar'
import { useOrganization } from '#/contexts/OrganizationContext'
import { usePageInsetSteps } from '#/hooks/use-is-phone'
import { useAnalyticsReport } from '#/hooks/use-analytics'
import type { AnalyticsView } from '#/lib/analytics/search'
import { formatReportWindow as windowLabel } from '#/lib/analytics/format'
import { linkTargetUrl } from '#/lib/links/link-summary'

/** Workspace analytics from recorded clicks; selecting a top link drills into it. */
type DashboardAnalyticsPanelProps = {
  /** Period, comparison, chart view and drilled-in link, kept in the URL by the route. */
  view: AnalyticsView
  onViewChange: (change: Partial<AnalyticsView>, options?: { push?: boolean }) => void
}

export default function DashboardAnalyticsPanel({ view, onViewChange }: DashboardAnalyticsPanelProps) {
  const { activeOrg, links } = useOrganization()
  const inset = usePageInsetSteps()
  const { range, linkId, isComparing } = view
  const query = useAnalyticsReport(activeOrg.id, range, linkId)
  const report = query.data
  const setLinkId = (id: string | null) => onViewChange({ linkId: id }, { push: true })

  const selected = linkId ? links.find((link) => link.id === linkId) ?? null : null
  const selectedLink = selected ? { slug: selected.slug, destination: linkTargetUrl(selected) } : null

  const drillInto = (id: string) => {
    setLinkId(id)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <VStack
      gap={6}
      hAlign="stretch"
      width="fill"
      paddingBlockStart={inset.block}
      paddingInline={inset.inline}
      paddingBlockEnd={10}
    >
      <VStack gap={2} hAlign="start" width="fill">
        <Heading level={1}>Analytics</Heading>
        <Text
          color="secondary"
          type="supporting"
          // Drilled-in links print a URL; break anywhere rather than overflow.
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        >
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
        onRangeChange={(next) => onViewChange({ range: next })}
        isComparing={isComparing}
        onCompareChange={(next) => onViewChange({ isComparing: next })}
      />

      <AnalyticsReportView
        organizationId={activeOrg.id}
        linkId={linkId}
        report={report}
        isLoading={query.isPending}
        error={query.error}
        onRetry={() => void query.refetch()}
        isComparing={isComparing}
        isSingleLink={linkId != null}
        onSelectLink={drillInto}
        trafficView={view.trafficView}
        onTrafficViewChange={(next) => onViewChange({ trafficView: next })}
      />
    </VStack>
  )
}
