import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { BarChartIcon } from '#/components/icons/IcnMcp'
import type { WorkspaceStats } from '#/contexts/OrganizationContext'
import { useIsPhone } from '#/hooks/use-is-phone'
import { formatCompactNumber } from '#/lib/format/compact-number'

type DashboardOverviewMetricsProps = {
  stats: WorkspaceStats
}

export default function DashboardOverviewMetrics({
  stats,
}: DashboardOverviewMetricsProps) {
  // Phones: three count tiles on one row (Clicks this week | Clicks today
  // | Short links) with Top referrer full-width beneath — two short rows
  // instead of a tall stack. Desktop keeps the responsive 4-up grid.
  const isPhone = useIsPhone()
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
      padding={isPhone ? 2 : 3}
      style={{
        border: 'var(--border-width) solid var(--color-border)',
        borderRadius: 'var(--radius-container)',
        backgroundColor: 'var(--color-background-body)',
      }}
    >
      <Grid
        columns={isPhone ? 3 : { minWidth: 180, max: 4 }}
        gap={isPhone ? 2 : 3}
        width="100%"
      >
        <VStack
          gap={4}
          padding={isPhone ? 4 : 5}
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
            padding={isPhone ? 4 : 5}
            vAlign="between"
            style={{
              minWidth: 0,
              // Top referrer claims the whole second phone row — its
              // hostname needs the runway far more than a number does.
              ...(isPhone && metric.label === 'Top referrer' ? { gridColumn: '1 / -1' } : null),
            }}
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
