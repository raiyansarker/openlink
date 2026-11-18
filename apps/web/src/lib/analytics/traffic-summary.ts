import type { AnalyticsReport } from '#/lib/analytics/report'
import { formatCompact, formatNumber } from '#/lib/analytics/format'

/** How a bucket is named on the axis and in the tooltip. */
export class BucketFormat {
  constructor(private readonly report: AnalyticsReport) {}

  tick = (value: Date) =>
    this.report.range === '24h'
      ? value.toLocaleTimeString(undefined, { hour: 'numeric' })
      : value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  heading = (value: unknown) => {
    if (!(value instanceof Date)) return String(value ?? '')
    return this.report.bucket === 'hour'
      ? value.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric' })
      : value.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

/** One line under the chart title: the busiest bucket, the average, and the leading channel. */
export function trafficSummary(report: AnalyticsReport): string {
  const series = report.totalsSeries
  if (series.length === 0) return ''
  const peak = series.reduce((best, point) => (point.clicks > best.clicks ? point : best), series[0]!)
  const average = report.totals.clicks / series.length
  const format = new BucketFormat(report)
  const top = report.channels[0]
  return [
    `Peak ${formatNumber(peak.clicks)} on ${format.heading(peak.time)}`,
    `${formatCompact(average)} a ${report.bucket} on average`,
    top ? `${top.label} leads with ${Math.round(top.share * 100)}%` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}
