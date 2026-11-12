import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import RankedBars from '#/components/analytics/RankedBars'
import { SERIES_COLORS } from '#/components/analytics/chart-theme'
import type { LinkRow } from '#/lib/analytics/demo-dataset'

type TopLinksCardProps = {
  rows: LinkRow[]
  isComparing: boolean
  onSelect: (linkId: string) => void
}

function destinationLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    return pathname === '/' ? hostname : `${hostname}${pathname}`
  } catch {
    return url
  }
}

/** Short links ranked by clicks; selecting a bar drills the whole page into that link. */
export default function TopLinksCard({ rows, isComparing, onSelect }: TopLinksCardProps) {
  return (
    <AnalyticsCard
      title="Top short links"
      description={`Ranked by clicks · ${rows.length} links · select one to drill in`}
    >
      <RankedBars
        rows={rows.map((row) => ({
          ...row,
          label: `/${row.slug}`,
          detail: `→ ${destinationLabel(row.destination)}`,
        }))}
        color={SERIES_COLORS[0]}
        label="Clicks by short link"
        isComparing={isComparing}
        limit={9}
        onSelect={onSelect}
      />
    </AnalyticsCard>
  )
}
