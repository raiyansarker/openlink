import { useMemo, useState } from 'react'
import { barY, defineChart } from '@tanstack/charts'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import { HOVER_TOOLTIP, NO_CHART_FOCUS, SERIES_COLORS, chartHostStyle } from '#/components/analytics/chart-theme'
import { formatCompact, formatNumber, formatPercent } from '#/lib/analytics/format'
import type { AnalyticsReport } from '#/lib/analytics/report'

type View = 'weekdays' | 'hours'
type Column = { key: string; label: string; clicks: number; share: number; isPeak: boolean }

/** Totals of the weekday-by-hour grid, as columns for one axis. */
class Rhythm {
  static columns(report: AnalyticsReport, view: View): Column[] {
    const labels = view === 'weekdays' ? report.heatmapDays : report.heatmapHours
    const totals = labels.map((label) =>
      report.heatmap.filter((cell) => (view === 'weekdays' ? cell.day : cell.hour) === label).reduce((sum, cell) => sum + cell.clicks, 0),
    )
    const all = totals.reduce((sum, value) => sum + value, 0) || 1
    const peak = Math.max(...totals)
    return labels.map((label, i) => ({
      key: label,
      label: view === 'hours' ? Rhythm.hourLabel(Number(label)) : label,
      clicks: totals[i]!,
      share: totals[i]! / all,
      isPeak: totals[i]! === peak && peak > 0,
    }))
  }

  static hourLabel(hour: number): string {
    return new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' })
  }
}

/** Which weekdays and hours bring the most clicks, from the same window as the heatmap. */
export default function RhythmCard({ report }: { report: AnalyticsReport }) {
  const [view, setView] = useState<View>('weekdays')
  const columns = useMemo(() => Rhythm.columns(report, view), [report, view])
  const peak = columns.find((c) => c.isPeak)

  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barY(columns, {
            x: 'label',
            y: 'clicks',
            // The busiest column is solid; the rest are a tint of it.
            fill: (column) =>
              column.isPeak ? SERIES_COLORS[0] : `color-mix(in oklab, ${SERIES_COLORS[0]} 38%, var(--color-background-surface))`,
            radius: 3,
            inset: view === 'hours' ? 1 : 4,
            key: 'key',
          }),
        ],
        scales: {
          x: {
            scale: () => scaleBand<string>().domain(columns.map((c) => c.label)).padding(0.15),
            axis: {
              ticks: {
                values: view === 'hours' ? columns.filter((_, i) => i % 3 === 0).map((c) => c.label) : columns.map((c) => c.label),
              },
            },
          },
          y: { scale: scaleLinear, nice: true, grid: true, axis: { ticks: { format: (v: number) => formatCompact(v), count: 3 } } },
        },
        focus: 'nearest-x',
        focusRing: false,
        ...NO_CHART_FOCUS,
        tooltip: {
          ...HOVER_TOOLTIP,
          format: (point) => `${point.datum.label}\n${formatNumber(point.datum.clicks)} clicks · ${formatPercent(point.datum.share)}`,
        },
      }),
    [columns, view],
  )

  return (
    <AnalyticsCard
      title="Busiest times"
      description={
        peak
          ? `${report.heatmapWindowLabel} · most clicks ${view === 'weekdays' ? `on ${peak.label}` : `around ${peak.label}`}, in your timezone`
          : report.heatmapWindowLabel
      }
      actions={
        <SegmentedControl label="Group by" value={view} onChange={(value) => setView(value as View)} size="sm">
          <SegmentedControlItem value="weekdays" label="Weekdays" />
          <SegmentedControlItem value="hours" label="Hours" />
        </SegmentedControl>
      }
    >
      <Chart definition={definition} height={200} initialWidth={480} style={chartHostStyle} ariaLabel={`Clicks by ${view === 'weekdays' ? 'weekday' : 'hour of day'}`} />
    </AnalyticsCard>
  )
}
