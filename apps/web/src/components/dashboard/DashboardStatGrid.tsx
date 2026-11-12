import { Grid } from '@astryxdesign/core/Grid'
import DashboardStatCard from './DashboardStatCard'
import type { DashboardStatCardModel } from '#/lib/dashboard/build-stat-cards'

type DashboardStatGridProps = {
  cards: DashboardStatCardModel[]
}

export default function DashboardStatGrid({ cards }: DashboardStatGridProps) {
  return (
    <Grid columns={{ minWidth: 200, max: 4 }} gap={3}>
      {cards.map((card) => (
        <DashboardStatCard key={card.label} card={card} />
      ))}
    </Grid>
  )
}
