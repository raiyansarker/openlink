import { type } from 'arktype'

import { OrganizationIdPath } from '../organizations/schema'

export const AnalyticsRange = type("'24h' | '7d' | '30d' | '90d'")
export type AnalyticsRange = typeof AnalyticsRange.infer

export const ClickChannel = type("'direct' | 'social' | 'search' | 'email' | 'qr' | 'referral'")
export type ClickChannel = typeof ClickChannel.infer

/** Query params arrive as strings. */
export const AnalyticsQuery = type({
  'range?': AnalyticsRange,
  /** One link, or the whole workspace when absent. */
  'linkId?': 'string',
  /**
   * The viewer's UTC offset in minutes (e.g. 360 for UTC+6), so days and the
   * weekday-by-hour grid line up with their clock.
   */
  'tzOffset?': type('string.integer.parse').to('-840 <= number.integer <= 840'),
})

const Totals = type({ clicks: 'number.integer>=0', unique: 'number.integer>=0', qr: 'number.integer>=0' })

export const BreakdownRow = type({
  key: 'string',
  label: 'string',
  clicks: 'number.integer>=0',
  previousClicks: 'number.integer>=0',
  /** Of all clicks in the window, 0..1. */
  share: 'number',
})

export const AnalyticsReport = type({
  /** A rolling range, or `month` for a calendar-month report. */
  range: AnalyticsRange.or("'month'"),
  bucket: "'hour' | 'day'",
  windowStart: 'string',
  windowEnd: 'string',
  totals: Totals,
  previousTotals: Totals,
  /** One point per bucket and channel, for the stacked chart. */
  traffic: type({ time: 'string', channel: ClickChannel, clicks: 'number.integer>=0' }).array(),
  totalsSeries: type({ time: 'string', clicks: 'number.integer>=0', unique: 'number.integer>=0', qr: 'number.integer>=0' }).array(),
  /** The previous window, shifted onto this window's time axis. */
  previousSeries: type({ time: 'string', clicks: 'number.integer>=0' }).array(),
  /** Weekday 0 (Sunday) … 6 by hour 0 … 23, in the viewer's time. */
  heatmap: type({ weekday: '0 <= number.integer <= 6', hour: '0 <= number.integer <= 23', clicks: 'number.integer>=0' }).array(),
  heatmapDays: 'number.integer>=1',
  links: BreakdownRow.and({ slug: 'string', destination: 'string' }).array(),
  destinations: BreakdownRow.and({ url: 'string', host: 'string', linkCount: 'number.integer>=0', slugs: 'string[]' }).array(),
  channels: BreakdownRow.and({ key: ClickChannel }).array(),
  referrers: BreakdownRow.array(),
  /** `key` is the ISO country code; the map point is the average click location, when known. */
  countries: BreakdownRow.and({ 'lat?': 'number', 'lng?': 'number' }).array(),
  cities: type({ key: 'string', label: 'string', country: 'string', clicks: 'number.integer>=0' }).array(),
  devices: BreakdownRow.array(),
  browsers: BreakdownRow.array(),
  operatingSystems: BreakdownRow.array(),
})
export type AnalyticsReport = typeof AnalyticsReport.infer

export const AnalyticsSummaryQuery = type({
  'tzOffset?': type('string.integer.parse').to('-840 <= number.integer <= 840'),
})

/** The overview tiles. "Today" is the viewer's calendar day; "week" is the last 7 days. */
export const AnalyticsSummary = type({
  clicksToday: 'number.integer>=0',
  clicksThisWeek: 'number.integer>=0',
  uniqueVisitorsWeek: 'number.integer>=0',
  'topReferrer?': 'string',
})

export const RecentClicksQuery = type({
  'linkId?': 'string',
  'limit?': type('string.integer.parse').to('1 <= number.integer <= 50'),
})

/** One recent click. Visitors are never identified: there is no IP or visitor id here. */
export const RecentClick = type({
  id: 'string',
  occurredAt: 'string',
  link: type({ id: 'string', slug: 'string', 'title?': 'string' }),
  channel: ClickChannel,
  'referrerHost?': 'string',
  'country?': 'string',
  'city?': 'string',
  device: 'string',
  browser: 'string',
  os: 'string',
})

export const RecentClicksResponse = type({ items: RecentClick.array() })

export { OrganizationIdPath }
