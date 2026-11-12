import type { DashboardStatCardModel } from '#/lib/dashboard/build-stat-cards'
import { formatCompactNumber } from '#/lib/format/compact-number'

type DashboardMetricStripProps = {
  cards: DashboardStatCardModel[]
}

export default function DashboardMetricStrip({ cards }: DashboardMetricStripProps) {
  return (
    <div className="openlink-metric-strip" role="list">
      {cards.map((card) => (
        <div key={card.label} className="openlink-metric" role="listitem">
          <div className="openlink-metric__label">{card.label}</div>
          <div className="openlink-metric__value">
            {typeof card.value === 'number'
              ? formatCompactNumber(card.value)
              : card.value}
          </div>
          <div className="openlink-metric__hint">{card.detail}</div>
        </div>
      ))}
    </div>
  )
}
