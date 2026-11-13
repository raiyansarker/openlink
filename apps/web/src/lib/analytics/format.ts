const compactFormatter = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const fullFormatter = new Intl.NumberFormat(undefined)
const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 1,
})

/** 12.4K, 1.2M — for tiles and axes. */
export function formatCompact(value: number): string {
  return compactFormatter.format(value)
}

/** 12,431 — for tables and tooltips. */
export function formatNumber(value: number): string {
  return fullFormatter.format(Math.round(value))
}

/** 0.124 → "12.4%". */
export function formatPercent(fraction: number): string {
  return percentFormatter.format(fraction)
}

/** Signed change between periods, e.g. "+12.4%" / "−3.1%"; null when there is no baseline. */
export function formatDelta(current: number, previous: number): string | null {
  if (previous <= 0) return null
  const change = (current - previous) / previous
  const sign = change > 0 ? '+' : change < 0 ? '−' : ''
  return `${sign}${percentFormatter.format(Math.abs(change))}`
}

export function deltaDirection(current: number, previous: number): 'up' | 'down' | 'flat' {
  if (previous <= 0) return 'flat'
  const change = (current - previous) / previous
  if (Math.abs(change) < 0.005) return 'flat'
  return change > 0 ? 'up' : 'down'
}

/** "Oct 14 – Nov 13" (or "Thu 9 AM – Fri 9 AM" for 24 hours): the report's window. */
export function formatReportWindow(report: {
  range: string
  windowStart: Date
  windowEnd: Date
}): string {
  const opts: Intl.DateTimeFormatOptions =
    report.range === '24h'
      ? { weekday: 'short', hour: 'numeric' }
      : { month: 'short', day: 'numeric' }
  return `${report.windowStart.toLocaleString(undefined, opts)} – ${report.windowEnd.toLocaleString(undefined, opts)}`
}
