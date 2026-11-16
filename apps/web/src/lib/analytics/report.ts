import type { AnalyticsRange, AnalyticsReport as AnalyticsReportDto, ClickChannel } from '@openlink/contracts'

export type { AnalyticsRange }

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
]

export type Channel = ClickChannel

export type BreakdownRow = {
  key: string
  label: string
  clicks: number
  previousClicks: number
  share: number
}

/** `lat`/`lng` are the average click location, when Cloudflare knew it. */
export type CountryRow = BreakdownRow & { code: string; lat?: number; lng?: number }
export type LinkRow = BreakdownRow & { slug: string; destination: string }
export type DestinationRow = BreakdownRow & { url: string; host: string; linkCount: number; slugs: string[] }
export type CityRow = { key: string; label: string; country: string; clicks: number }
/** `channel` is the channel's label (the stack's legend). */
export type TrafficPoint = { time: Date; channel: string; clicks: number }
export type TotalPoint = { time: Date; clicks: number; unique: number; qr: number }
export type HeatCell = { day: string; hour: string; clicks: number }

/** What the analytics screens render. Built from the API report by `AnalyticsReportMapper`. */
export type AnalyticsReport = {
  range: AnalyticsRange
  bucket: 'hour' | 'day'
  windowStart: Date
  windowEnd: Date
  totals: { clicks: number; unique: number; qr: number }
  previousTotals: { clicks: number; unique: number; qr: number }
  /** Long format (one row per bucket × channel) for the stacked area. */
  traffic: TrafficPoint[]
  totalsSeries: TotalPoint[]
  /** Previous window's totals, shifted onto the current window's time axis. */
  previousSeries: { time: Date; clicks: number }[]
  heatmap: HeatCell[]
  heatmapDays: string[]
  heatmapHours: string[]
  heatmapWindowLabel: string
  links: LinkRow[]
  destinations: DestinationRow[]
  channels: (BreakdownRow & { key: Channel })[]
  referrers: BreakdownRow[]
  countries: CountryRow[]
  cities: CityRow[]
  devices: BreakdownRow[]
  browsers: BreakdownRow[]
  operatingSystems: BreakdownRow[]
}

export class AnalyticsReportMapper {
  static readonly HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  static readonly HEATMAP_HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))
  /** API weekdays count from Sunday = 0. */
  private static readonly WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  static fromApi(dto: AnalyticsReportDto): AnalyticsReport {
    const labels = new Map(dto.channels.map((c) => [c.key, c.label]))
    const heat = new Map(dto.heatmap.map((cell) => [`${AnalyticsReportMapper.WEEKDAYS[cell.weekday]}|${cell.hour}`, cell.clicks]))
    return {
      range: dto.range,
      bucket: dto.bucket,
      windowStart: new Date(dto.windowStart),
      windowEnd: new Date(dto.windowEnd),
      totals: dto.totals,
      previousTotals: dto.previousTotals,
      // Only channels that had clicks are stacked, so the legend lists what happened.
      traffic: dto.traffic.flatMap((point) => {
        const label = labels.get(point.channel)
        return label ? [{ time: new Date(point.time), channel: label, clicks: point.clicks }] : []
      }),
      totalsSeries: dto.totalsSeries.map((point) => ({ ...point, time: new Date(point.time) })),
      previousSeries: dto.previousSeries.map((point) => ({ ...point, time: new Date(point.time) })),
      heatmap: AnalyticsReportMapper.HEATMAP_DAYS.flatMap((day) =>
        AnalyticsReportMapper.HEATMAP_HOURS.map((hour) => ({ day, hour, clicks: heat.get(`${day}|${Number(hour)}`) ?? 0 })),
      ),
      heatmapDays: AnalyticsReportMapper.HEATMAP_DAYS,
      heatmapHours: AnalyticsReportMapper.HEATMAP_HOURS,
      heatmapWindowLabel: `Last ${dto.heatmapDays} days`,
      links: dto.links,
      destinations: dto.destinations,
      channels: dto.channels,
      referrers: dto.referrers,
      countries: dto.countries.map((country) => ({ ...country, code: country.key })),
      cities: dto.cities,
      devices: dto.devices,
      browsers: dto.browsers,
      operatingSystems: dto.operatingSystems,
    }
  }

  /** Nothing recorded in this window or the one before. */
  static isEmpty(report: AnalyticsReport): boolean {
    return report.totals.clicks === 0 && report.previousTotals.clicks === 0
  }
}
