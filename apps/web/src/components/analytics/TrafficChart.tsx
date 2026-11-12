import { useMemo } from 'react'
import { areaY, colorLegend, defineChart, lineY, stack } from '@tanstack/charts'
import { crosshair } from '@tanstack/charts/crosshair'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { Chart } from '@tanstack/charts/react'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { tooltip } from '@tanstack/charts/tooltip'
import { scaleTime } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { CHANNEL_COLORS, NEUTRAL_SERIES, chartHostStyle } from '#/components/analytics/chart-theme'
import type { AnalyticsReport } from '#/lib/analytics/demo-dataset'
import { formatCompact, formatNumber } from '#/lib/analytics/format'

type TrafficChartProps = {
  report: AnalyticsReport
  isComparing: boolean
  height?: number
}

const smooth = d3Curve(curveMonotoneX)
const PREVIOUS_LABEL = 'Previous period'

/** Clicks over time, stacked by channel, with the previous period as a dashed total. */
export default function TrafficChart({ report, isComparing, height = 300 }: TrafficChartProps) {
  // Biggest channel first: bottom of the stack and first in the legend.
  const channelOrder = useMemo(
    () => report.channels.map((c) => c.label),
    [report.channels],
  )

  const definition = useMemo(() => {
    const isHourly = report.bucket === 'hour'
    const tickFormat = (value: Date) =>
      isHourly && report.range === '24h'
        ? value.toLocaleTimeString(undefined, { hour: 'numeric' })
        : value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

    const tooltipHeading = (value: unknown) => {
      if (!(value instanceof Date)) return String(value ?? '')
      return isHourly
        ? value.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' })
        : value.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    }

    const previous = report.previousSeries.map((p) => ({ ...p, series: PREVIOUS_LABEL }))

    return defineChart({
      marks: [
        areaY(report.traffic, {
          x: 'time',
          y: 'clicks',
          color: 'channel',
          layout: stack({ order: channelOrder }),
          fillOpacity: 0.78,
          curve: smooth,
        }),
        ...(isComparing
          ? [
              lineY(previous, {
                x: 'time',
                y: 'clicks',
                color: 'series',
                stroke: NEUTRAL_SERIES,
                strokeWidth: 1.5,
                strokeDasharray: '4 4',
                curve: smooth,
              }),
            ]
          : []),
        crosshair({ x: true, y: false }),
      ],
      scales: {
        x: {
          scale: scaleTime,
          axis: { ticks: { format: tickFormat, spacing: 90 } },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { ticks: { format: (value: number) => formatCompact(value) } },
        },
      },
      color: {
        domain: isComparing ? [...channelOrder, PREVIOUS_LABEL] : channelOrder,
        range: [
          ...report.channels.map((c) => CHANNEL_COLORS[c.key] ?? NEUTRAL_SERIES),
          ...(isComparing ? [NEUTRAL_SERIES] : []),
        ],
        legend: colorLegend(),
      },
      focus: 'group-x',
      tooltip: {
        use: tooltip,
        sort: 'color-domain',
        items: [
          { channel: 'x', text: (point) => tooltipHeading(point.xValue) },
          { channel: 'y', text: (point) => formatNumber(Number(point.yValue)) },
        ],
      },
    })
  }, [report, isComparing, channelOrder])

  return (
    <Chart
      definition={definition}
      height={height}
      initialWidth={960}
      style={chartHostStyle}
      ariaLabel="Clicks over time by channel"
      ariaDescription={`Stacked clicks per ${report.bucket} for ${report.channels.length} channels${isComparing ? ', with the previous period as a dashed line' : ''}.`}
    />
  )
}
