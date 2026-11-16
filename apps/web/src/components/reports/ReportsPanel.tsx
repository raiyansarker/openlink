import { useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Section } from '@astryxdesign/core/Section'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsReportView from '#/components/analytics/AnalyticsReportView'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useCampaigns, useMonthlyReport } from '#/hooks/use-reports'
import { formatNumber } from '#/lib/analytics/format'
import type { TrafficView } from '#/lib/analytics/search'
import { ReportsApi } from '#/lib/api/reports'
import { ReportMonth } from '#/lib/reports/month'

/** How far back the month picker goes. */
const MONTHS_SHOWN = 12
const ALL_LINKS = '__all__'

type ReportsPanelProps = {
  month: ReportMonth
  campaign: string | null
  onChange: (change: { month?: ReportMonth; campaign?: string | null }) => void
}

/**
 * Reports: a calendar month of clicks compared with the month before, for the
 * whole workspace or one UTM campaign, with CSV downloads of the same data.
 */
export default function ReportsPanel({ month, campaign, onChange }: ReportsPanelProps) {
  const { activeOrg } = useOrganization()
  const query = useMonthlyReport(activeOrg.id, month, campaign)
  const campaigns = useCampaigns(activeOrg.id).data ?? []
  const [trafficView, setTrafficView] = useState<TrafficView>('total')
  const monthly = query.data

  const months = ReportMonth.recent(MONTHS_SHOWN)
  // A month or campaign from a shared URL stays selectable even if it's outside the lists.
  const monthOptions = (months.some((m) => m.key === month.key) ? months : [month, ...months]).map((m) => ({ value: m.key, label: m.label }))
  const campaignOptions = [
    { value: ALL_LINKS, label: 'All links' },
    ...(campaign && !campaigns.some((c) => c.name === campaign) ? [{ value: campaign, label: campaign }] : []),
    ...campaigns.map((c) => ({ value: c.name, label: `${c.name} · ${c.links} ${c.links === 1 ? 'link' : 'links'}` })),
  ]

  const scopeLine = monthly
    ? [
        campaign ? `Campaign “${campaign}”${monthly.linkCount != null ? ` · ${monthly.linkCount} ${monthly.linkCount === 1 ? 'link' : 'links'}` : ''}` : 'All links',
        `${formatNumber(monthly.newLinks)} new ${monthly.newLinks === 1 ? 'link' : 'links'} this month`,
        'compared with the month before',
      ].join(' · ')
    : null

  return (
    <Section paddingInline={8} paddingBlockStart={8} paddingBlockEnd={10}>
      <VStack gap={8} width="fill">
        <VStack gap={2}>
          <Heading level={1}>Reports</Heading>
          <Text color="secondary">A month of clicks for the workspace or one campaign, ready to share or export.</Text>
        </VStack>

        <VStack gap={3} width="fill">
          <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap" width="fill">
            <HStack gap={3} vAlign="center" wrap="wrap">
              <Selector
                label="Month"
                isLabelHidden
                size="sm"
                width={200}
                options={monthOptions}
                value={month.key}
                onChange={(value) => onChange({ month: ReportMonth.parse(value) })}
              />
              <Selector
                label="Campaign"
                isLabelHidden
                size="sm"
                width={260}
                options={campaignOptions}
                value={campaign ?? ALL_LINKS}
                onChange={(value) => onChange({ campaign: value === ALL_LINKS ? null : value })}
              />
            </HStack>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Button
                variant="secondary"
                size="sm"
                label="Download clicks (CSV)"
                tooltip="One row per click in this month"
                href={ReportsApi.exportUrl(activeOrg.id, 'clicks', month, campaign)}
              />
              <Button
                variant="secondary"
                size="sm"
                label="Download links (CSV)"
                tooltip="One row per link, with its clicks this month"
                href={ReportsApi.exportUrl(activeOrg.id, 'links', month, campaign)}
              />
            </HStack>
          </HStack>
          {scopeLine ? (
            <Text type="supporting" color="secondary">
              {scopeLine}
            </Text>
          ) : null}
        </VStack>

        <AnalyticsReportView
          organizationId={activeOrg.id}
          linkId={null}
          report={monthly?.report}
          isLoading={query.isPending}
          error={query.error}
          onRetry={() => void query.refetch()}
          isComparing
          trafficView={trafficView}
          onTrafficViewChange={setTrafficView}
          // A past month has no "recent clicks".
          showRecentClicks={false}
        />
      </VStack>
    </Section>
  )
}
