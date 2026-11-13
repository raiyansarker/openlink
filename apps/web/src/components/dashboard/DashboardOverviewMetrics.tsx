import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { BarChartIcon } from '#/components/icons/IcnMcp'
import type { OrgDashboardStats } from '#/data/demo/types'
import { formatCompactNumber } from '#/lib/format/compact-number'

type DashboardOverviewMetricsProps = {
  stats: OrgDashboardStats
}

export default function DashboardOverviewMetrics({
  stats,
}: DashboardOverviewMetricsProps) {
  const metrics = [
    {
      label: 'Clicks today',
      value: formatCompactNumber(stats.clicksToday),
      detail: 'Across all your links',
    },
    {
      label: 'Short links',
      value: formatCompactNumber(stats.totalLinks),
      detail: `${stats.activeLinks.toLocaleString()} currently live`,
    },
    {
      label: 'Top referrer',
      value: stats.topReferrer,
      detail: 'Last 7 days',
    },
  ]

  return (
    <VStack
      width="fill"
      padding={3}
      style={{
        border: 'var(--border-width) solid var(--color-border)',
        borderRadius: 'var(--radius-container)',
        backgroundColor: 'var(--color-background-body)',
      }}
    >
      <Grid columns={{ minWidth: 180, max: 4 }} gap={3} width="100%">
        <VStack
          gap={4}
          padding={5}
          style={{
            backgroundColor: 'var(--color-background-surface)',
            borderRadius: 'var(--radius-element)',
            minWidth: 0,
          }}
        >
          <HStack gap={2} vAlign="center">
            <BarChartIcon
              aria-hidden="true"
              style={{ color: 'var(--openlink-brand)', flexShrink: 0 }}
            />
            <Text type="supporting" weight="medium">
              Clicks this week
            </Text>
          </HStack>
          <VStack gap={2}>
            <Heading level={3} type="display-3" weight="semibold" maxLines={1}>
              {formatCompactNumber(stats.clicksThisWeek)}
            </Heading>
            <Text type="supporting" color="secondary">
              {formatCompactNumber(stats.uniqueVisitorsWeek)} unique visitors
            </Text>
          </VStack>
        </VStack>
        {metrics.map((metric) => (
          <VStack
            key={metric.label}
            gap={4}
            padding={5}
            vAlign="between"
            style={{ minWidth: 0 }}
          >
            <Text type="supporting" color="secondary">
              {metric.label}
            </Text>
            <VStack gap={2}>
              <Heading level={3} weight="medium" maxLines={1}>
                {metric.value}
              </Heading>
              <Text type="supporting" color="secondary">
                {metric.detail}
              </Text>
            </VStack>
          </VStack>
        ))}
      </Grid>
    </VStack>
  )
}
