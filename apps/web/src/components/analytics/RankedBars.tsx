import { useMemo } from 'react'
import { barX, defineChart, text } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { chartHostStyle } from '#/components/analytics/chart-theme'
import type { BreakdownRow } from '#/lib/analytics/demo-dataset'
import {
  formatDelta,
  formatNumber,
  formatPercent,
} from '#/lib/analytics/format'

type RankedBarsProps = {
  rows: BreakdownRow[]
  color: string
  label: string
  isComparing: boolean
  /** Rows shown before the rest are folded away. */
  limit?: number
}

const ROW_HEIGHT = 30

/** Horizontal ranked bars with the value and share printed at the end of each bar. */
export default function RankedBars({
  rows,
  color,
  label,
  isComparing,
  limit = 8,
}: RankedBarsProps) {
  const visible = useMemo(() => rows.slice(0, limit), [rows, limit])
  const max = Math.max(1, ...visible.map((r) => r.clicks))

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barX(visible, {
            y: 'label',
            x: 'clicks',
            fill: color,
            // A tint, not a solid bar, so the label printed on top stays readable.
            fillOpacity: 0.2,
            radius: 4,
            key: 'key',
          }),
          text(visible, {
            y: 'label',
            x: () => 0,
            text: 'label',
            dx: 8,
            anchor: 'start',
            fill: 'var(--color-text-primary)',
            fontSize: 12,
          }),
          text(visible, {
            y: 'label',
            x: () => max,
            text: (row) =>
              `${formatNumber(row.clicks)}  ${formatPercent(row.share)}`,
            dx: -8,
            anchor: 'end',
            fill: 'var(--color-text-secondary)',
            fontSize: 12,
          }),
        ],
        scales: {
          y: {
            scale: () =>
              scaleBand<string>()
                .domain(visible.map((r) => r.label))
                .padding(0.18),
            axis: false,
          },
          x: { scale: scaleLinear, axis: false, domain: [0, max] },
        },
        margin: 0,
        focus: 'nearest-y',
        tooltip: {
          use: tooltip,
          format: (point) => {
            const row = point.datum
            const delta = formatDelta(row.clicks, row.previousClicks)
            return [
              row.label,
              `${formatNumber(row.clicks)} clicks · ${formatPercent(row.share)}`,
              isComparing && delta ? `${delta} vs previous` : null,
            ]
              .filter(Boolean)
              .join('\n')
          },
        },
      }),
    [visible, max, color, isComparing],
  )

  return (
    <Chart
      definition={definition}
      height={Math.max(1, visible.length) * ROW_HEIGHT}
      initialWidth={480}
      style={chartHostStyle}
      ariaLabel={label}
    />
  )
}
