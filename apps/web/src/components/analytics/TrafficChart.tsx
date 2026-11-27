import { useMemo } from 'react'
import {
  areaY,
  barY,
  colorLegend,
  defineChart,
  lineY,
  stack,
  type ChartPoint,
  type ChartTooltipContent,
} from '@tanstack/charts'
import { crosshair } from '@tanstack/charts/crosshair'
import { d3Curve } from '@tanstack/charts/d3/shape'
import { Chart } from '@tanstack/charts/react'
import { scaleBand } from '@tanstack/charts/scales/band'
import { scaleLinear } from '@tanstack/charts/scales/linear'
import { scaleTime } from 'd3-scale'
import { curveMonotoneX } from 'd3-shape'
import { CHANNEL_COLORS, HOVER_TOOLTIP, NEUTRAL_SERIES, NO_CHART_FOCUS, SERIES_COLORS, chartHostStyle } from '#/components/analytics/chart-theme'
import type { AnalyticsReport } from '#/lib/analytics/report'
import { formatCompact, formatNumber } from '#/lib/analytics/format'
import { BucketFormat } from '#/lib/analytics/traffic-summary'

import type { TrafficView } from '#/lib/analytics/search'

export type { TrafficView }

type TrafficChartProps = {
  report: AnalyticsReport
  isComparing: boolean
  view: TrafficView
  height?: number
}

/** Monotone keeps the curve between the real values: no dips below zero or false peaks. */
const smooth = d3Curve(curveMonotoneX)

const SERIES = { clicks: 'Clicks', unique: 'Unique visitors', previous: 'Previous period' } as const

/** `isFill` marks the fill under the clicks line, which the tooltip skips. */
type TimePoint = { time: Date; value: number; series: string; isFill?: boolean }
type BandPoint = { time: number; value: number; series: string }

/** Tooltip rows: one per series, named by the series and the exact count. */
class TooltipRows {
  static of(points: readonly ChartPoint[], primary: ChartPoint | undefined, title: string): ChartTooltipContent {
    return {
      title,
      rows: points.map((point) => ({
        label: (point.datum as { series: string }).series,
        value: formatNumber(Number(point.yValue)),
        ...(point.color ? { color: point.color } : {}),
        active: point === primary,
      })),
    }
  }
}

const previousStyle = { color: 'series', stroke: NEUTRAL_SERIES, strokeWidth: 1.5, strokeDasharray: '4 4', curve: smooth } as const

const yScale = {
  scale: scaleLinear,
  nice: true,
  grid: true,
  axis: { ticks: { format: (value: number) => formatCompact(value), count: 4 } },
}

/**
 * Clicks over time. "Total" is one soft area with unique visitors as a second
 * line; "By channel" stacks a bar per bucket, which reads honestly even when
 * most buckets are near zero. The previous period is a dashed line in both.
 */
export default function TrafficChart({ report, isComparing, view, height = 300 }: TrafficChartProps) {
  const common = {
    height,
    initialWidth: 960,
    style: chartHostStyle,
    ariaDescription: `Clicks per ${report.bucket}${view === 'channels' ? `, stacked by ${report.channels.length} channels` : ', with unique visitors'}${isComparing ? ', and the previous period as a dashed line' : ''}.`,
  }
  return view === 'total' ? (
    <TotalChart report={report} isComparing={isComparing} {...common} />
  ) : (
    <ChannelChart report={report} isComparing={isComparing} {...common} />
  )
}

type ViewProps = { report: AnalyticsReport; isComparing: boolean; height: number; initialWidth: number; style: typeof chartHostStyle; ariaDescription: string }

function TotalChart({ report, isComparing, ...host }: ViewProps) {
  const definition = useMemo(() => {
    const format = new BucketFormat(report)
    const clicks: TimePoint[] = report.totalsSeries.map((p) => ({ time: p.time, value: p.clicks, series: SERIES.clicks }))
    const unique: TimePoint[] = report.totalsSeries.map((p) => ({ time: p.time, value: p.unique, series: SERIES.unique }))
    const previous: TimePoint[] = report.previousSeries.map((p) => ({ time: p.time, value: p.clicks, series: SERIES.previous }))
    return defineChart({
      marks: [
        areaY(
          clicks.map((p) => ({ ...p, isFill: true })),
          { x: 'time', y: 'value', fill: SERIES_COLORS[0], fillOpacity: 0.14, curve: smooth },
        ),
        lineY(clicks, { x: 'time', y: 'value', color: 'series', strokeWidth: 2, curve: smooth }),
        lineY(unique, { x: 'time', y: 'value', color: 'series', strokeWidth: 1.5, curve: smooth }),
        ...(isComparing ? [lineY(previous, { x: 'time', y: 'value', ...previousStyle })] : []),
        crosshair({ x: true, y: false }),
      ],
      scales: {
        x: { scale: scaleTime, axis: { ticks: { format: format.tick, spacing: 90 } } },
        y: yScale,
      },
      color: {
        domain: isComparing ? [SERIES.clicks, SERIES.unique, SERIES.previous] : [SERIES.clicks, SERIES.unique],
        range: [SERIES_COLORS[0], SERIES_COLORS[1], ...(isComparing ? [NEUTRAL_SERIES] : [])],
        legend: colorLegend(),
      },
      focus: 'group-x',
      ...NO_CHART_FOCUS,
      tooltip: {
        ...HOVER_TOOLTIP,
        content: (points, context) =>
          TooltipRows.of(
            points.filter((point) => !(point.datum as TimePoint).isFill),
            context.primaryPoint,
            format.heading(points[0]?.xValue),
          ),
      },
    })
  }, [report, isComparing])

  return <Chart definition={definition} ariaLabel="Clicks and unique visitors over time" {...host} />
}

function ChannelChart({ report, isComparing, ...host }: ViewProps) {
  const definition = useMemo(() => {
    const format = new BucketFormat(report)
    const channelOrder = report.channels.map((c) => c.label)
    const times = report.totalsSeries.map((p) => p.time.getTime())
    // Every few buckets get a label, so they never collide.
    const every = Math.max(1, Math.ceil(times.length / 8))
    const bars: BandPoint[] = report.traffic.map((p) => ({ time: p.time.getTime(), value: p.clicks, series: p.channel }))
    const previous: BandPoint[] = report.previousSeries.map((p) => ({ time: p.time.getTime(), value: p.clicks, series: SERIES.previous }))
    return defineChart({
      marks: [
        barY(bars, {
          x: 'time',
          y: 'value',
          color: 'series',
          layout: stack({ order: channelOrder }),
          inset: times.length > 60 ? 0.5 : 1.5,
          radius: 2,
        }),
        ...(isComparing ? [lineY(previous, { x: 'time', y: 'value', ...previousStyle })] : []),
      ],
      scales: {
        x: {
          scale: () => scaleBand<number>().domain(times).padding(0.12),
          axis: {
            ticks: {
              values: times.filter((_, i) => i % every === 0),
              format: (value: number) => format.tick(new Date(value)),
            },
          },
        },
        y: yScale,
      },
      color: {
        domain: isComparing ? [...channelOrder, SERIES.previous] : channelOrder,
        range: [...report.channels.map((c) => CHANNEL_COLORS[c.key] ?? NEUTRAL_SERIES), ...(isComparing ? [NEUTRAL_SERIES] : [])],
        legend: colorLegend(),
      },
      focus: 'group-x',
      ...NO_CHART_FOCUS,
      tooltip: {
        ...HOVER_TOOLTIP,
        content: (points, context) =>
          TooltipRows.of(
            // Channels with no clicks in this bucket only add noise.
            points.filter((point) => Number(point.yValue) > 0 || (point.datum as BandPoint).series === SERIES.previous),
            context.primaryPoint,
            format.heading(new Date(Number(points[0]?.xValue))),
          ),
      },
    })
  }, [report, isComparing])

  return <Chart definition={definition} ariaLabel="Clicks over time by channel" {...host} />
}
