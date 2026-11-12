import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import RankedBars from '#/components/analytics/RankedBars'
import { SERIES_COLORS } from '#/components/analytics/chart-theme'
import type { DestinationRow } from '#/lib/analytics/demo-dataset'

type DestinationsCardProps = {
  rows: DestinationRow[]
  isComparing: boolean
}

/** Pages people land on, combining every short link that points to the same URL. */
export default function DestinationsCard({ rows, isComparing }: DestinationsCardProps) {
  const shared = rows.filter((r) => r.linkCount > 1).length

  return (
    <AnalyticsCard
      title="Top destinations"
      description={
        shared > 0
          ? `Where clicks land · ${shared} ${shared === 1 ? 'page is' : 'pages are'} reached by several links`
          : 'Where clicks land'
      }
    >
      <RankedBars
        rows={rows.map((row) => ({
          ...row,
          detail:
            row.linkCount === 1
              ? `via /${row.slugs[0]}`
              : `via ${row.slugs.map((s) => `/${s}`).join(', ')}`,
        }))}
        color={SERIES_COLORS[2]}
        label="Clicks by destination"
        isComparing={isComparing}
        limit={9}
      />
    </AnalyticsCard>
  )
}
