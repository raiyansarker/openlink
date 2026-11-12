import { demoStatsByOrg } from '#/data/demo/stats'
import { noise } from '#/lib/analytics/random'

export type AnalyticsRange = '24h' | '7d' | '30d' | '90d'

export const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
]

const RANGE_HOURS: Record<AnalyticsRange, number> = {
  '24h': 24,
  '7d': 24 * 7,
  '30d': 24 * 30,
  '90d': 24 * 90,
}

export const CHANNELS = ['direct', 'social', 'search', 'email', 'qr'] as const
export type Channel = (typeof CHANNELS)[number]

export const CHANNEL_LABELS: Record<Channel, string> = {
  direct: 'Direct',
  social: 'Social',
  search: 'Search',
  email: 'Email',
  qr: 'QR scans',
}

export type TrackedLink = {
  id: string
  slug: string
  title: string
  /** Where the short link redirects. Several links may share one destination. */
  destination: string
}

/** Used when a workspace has no links yet, so the page still demonstrates itself. */
export const SAMPLE_LINKS: TrackedLink[] = [
  { id: 'sample_launch', slug: 'launch', title: 'Product launch', destination: 'https://example.com/launch' },
  { id: 'sample_launch_x', slug: 'launch-x', title: 'Launch thread on X', destination: 'https://example.com/launch' },
  { id: 'sample_pricing', slug: 'pricing', title: 'Pricing', destination: 'https://example.com/pricing' },
  { id: 'sample_docs', slug: 'docs', title: 'Developer docs', destination: 'https://docs.example.com/start' },
  { id: 'sample_spring', slug: 'spring-sale', title: 'Spring sale campaign', destination: 'https://shop.example.com/sale' },
  { id: 'sample_app', slug: 'app', title: 'Mobile app download', destination: 'https://apps.apple.com/app/example' },
  { id: 'sample_app_qr', slug: 'app-qr', title: 'App QR on packaging', destination: 'https://apps.apple.com/app/example' },
  { id: 'sample_news', slug: 'newsletter', title: 'Newsletter signup', destination: 'https://example.com/newsletter' },
  { id: 'sample_careers', slug: 'careers', title: 'Careers', destination: 'https://example.com/careers' },
  { id: 'sample_webinar', slug: 'webinar', title: 'November webinar', destination: 'https://events.example.com/nov' },
]

export type BreakdownRow = {
  key: string
  label: string
  clicks: number
  previousClicks: number
  share: number
}

export type CountryRow = BreakdownRow & { code: string; lat: number; lng: number }

export type LinkRow = BreakdownRow & {
  slug: string
  destination: string
  unique: number
  /** Most common source for this link in the window. */
  topReferrer: string
  topCountry: string
  /** Daily (or hourly) clicks for an inline trend. */
  trend: { time: Date; value: number }[]
}

export type DestinationRow = BreakdownRow & { url: string; host: string; linkCount: number; slugs: string[] }

export type CityRow = { key: string; label: string; country: string; clicks: number }

export type TrafficPoint = { time: Date; channel: string; clicks: number }
export type TotalPoint = { time: Date; clicks: number; unique: number; qr: number }
export type HeatCell = { day: string; hour: string; clicks: number }

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
  /** Links with the biggest gains and drops against the previous period. */
  movers: { rising: LinkRow[]; falling: LinkRow[] }
  channels: BreakdownRow[]
  referrers: BreakdownRow[]
  countries: CountryRow[]
  cities: CityRow[]
  devices: BreakdownRow[]
  browsers: BreakdownRow[]
  operatingSystems: BreakdownRow[]
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

const CHANNEL_WEIGHTS: Record<Channel, number> = {
  direct: 0.31,
  social: 0.27,
  search: 0.18,
  email: 0.14,
  qr: 0.1,
}

const REFERRERS: { key: string; channel: Channel; weight: number }[] = [
  { key: 'x.com', channel: 'social', weight: 0.34 },
  { key: 'linkedin.com', channel: 'social', weight: 0.28 },
  { key: 'instagram.com', channel: 'social', weight: 0.22 },
  { key: 'reddit.com', channel: 'social', weight: 0.16 },
  { key: 'google.com', channel: 'search', weight: 0.78 },
  { key: 'bing.com', channel: 'search', weight: 0.14 },
  { key: 'duckduckgo.com', channel: 'search', weight: 0.08 },
  { key: 'Newsletter', channel: 'email', weight: 0.62 },
  { key: 'Gmail', channel: 'email', weight: 0.38 },
]

const COUNTRIES: { key: string; label: string; weight: number; lat: number; lng: number }[] = [
  { key: 'US', label: 'United States', weight: 0.34, lat: 39.5, lng: -98.35 },
  { key: 'GB', label: 'United Kingdom', weight: 0.11, lat: 54.0, lng: -2.0 },
  { key: 'DE', label: 'Germany', weight: 0.09, lat: 51.2, lng: 10.4 },
  { key: 'IN', label: 'India', weight: 0.09, lat: 21.1, lng: 78.0 },
  { key: 'BD', label: 'Bangladesh', weight: 0.06, lat: 23.7, lng: 90.4 },
  { key: 'CA', label: 'Canada', weight: 0.06, lat: 56.1, lng: -106.3 },
  { key: 'FR', label: 'France', weight: 0.05, lat: 46.2, lng: 2.2 },
  { key: 'BR', label: 'Brazil', weight: 0.05, lat: -14.2, lng: -51.9 },
  { key: 'JP', label: 'Japan', weight: 0.05, lat: 36.2, lng: 138.3 },
  { key: 'AU', label: 'Australia', weight: 0.04, lat: -25.3, lng: 133.8 },
  { key: 'NL', label: 'Netherlands', weight: 0.03, lat: 52.1, lng: 5.3 },
  { key: 'SG', label: 'Singapore', weight: 0.03, lat: 1.35, lng: 103.8 },
]

const CITIES: { key: string; country: string; weight: number }[] = [
  { key: 'New York', country: 'US', weight: 0.3 },
  { key: 'San Francisco', country: 'US', weight: 0.24 },
  { key: 'Austin', country: 'US', weight: 0.16 },
  { key: 'Seattle', country: 'US', weight: 0.14 },
  { key: 'Chicago', country: 'US', weight: 0.16 },
  { key: 'London', country: 'GB', weight: 0.62 },
  { key: 'Manchester', country: 'GB', weight: 0.38 },
  { key: 'Berlin', country: 'DE', weight: 0.55 },
  { key: 'Munich', country: 'DE', weight: 0.45 },
  { key: 'Bengaluru', country: 'IN', weight: 0.46 },
  { key: 'Mumbai', country: 'IN', weight: 0.54 },
  { key: 'Dhaka', country: 'BD', weight: 0.82 },
  { key: 'Chattogram', country: 'BD', weight: 0.18 },
  { key: 'Toronto', country: 'CA', weight: 0.6 },
  { key: 'Paris', country: 'FR', weight: 1 },
  { key: 'São Paulo', country: 'BR', weight: 1 },
  { key: 'Tokyo', country: 'JP', weight: 1 },
  { key: 'Sydney', country: 'AU', weight: 1 },
  { key: 'Amsterdam', country: 'NL', weight: 1 },
  { key: 'Singapore', country: 'SG', weight: 1 },
]

const DEVICES = [
  { key: 'Mobile', weight: 0.58 },
  { key: 'Desktop', weight: 0.36 },
  { key: 'Tablet', weight: 0.06 },
]
const BROWSERS = [
  { key: 'Chrome', weight: 0.49 },
  { key: 'Safari', weight: 0.31 },
  { key: 'Edge', weight: 0.07 },
  { key: 'Firefox', weight: 0.05 },
  { key: 'Samsung Internet', weight: 0.04 },
  { key: 'In-app browser', weight: 0.04 },
]
const OPERATING_SYSTEMS = [
  { key: 'iOS', weight: 0.33 },
  { key: 'Android', weight: 0.27 },
  { key: 'Windows', weight: 0.2 },
  { key: 'macOS', weight: 0.16 },
  { key: 'Linux', weight: 0.04 },
]

/** Clicks per hour of day: overnight trough, afternoon peak, evening shoulder. */
function hourOfDayFactor(hour: number): number {
  const afternoon = Math.exp(-((hour - 14) ** 2) / 18)
  const evening = 0.55 * Math.exp(-((hour - 20.5) ** 2) / 6)
  return 0.12 + afternoon + evening
}

function weekdayFactor(weekday: number): number {
  return weekday === 0 || weekday === 6 ? 0.68 : 1
}

/** Splits an integer total into parts proportional to weights (largest remainder). */
function apportion(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const raw = weights.map((w) => (w / sum) * total)
  const parts = raw.map(Math.floor)
  let remainder = total - parts.reduce((a, b) => a + b, 0)
  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (let i = 0; remainder > 0 && i < order.length; i++, remainder--) {
    parts[order[i].index] += 1
  }
  return parts
}

type HourSample = { start: number; clicks: number; unique: number; byChannel: number[] }

/** Hour-by-hour clicks for one workspace (and optionally one link). */
function sampleHours(
  seed: string,
  now: number,
  baseHourly: number,
  from: number,
  hours: number,
  linkShare: (start: number) => number,
  channelBias: number[],
): HourSample[] {
  const spikes = [0.18, 0.61].map((f, i) => ({
    at: Math.floor(noise(seed, 'spike', i) * 80 + 4) * DAY,
    strength: 1.6 + noise(seed, 'spike-strength', i) * 1.4,
    fraction: f,
  }))

  const samples: HourSample[] = []
  for (let i = 0; i < hours; i++) {
    const start = from + i * HOUR
    const date = new Date(start)
    const daysAgo = (now - start) / DAY
    const trend = 1 + 0.22 * Math.max(0, 1 - daysAgo / 180)
    const spike = spikes.reduce((acc, s) => {
      const since = (start - (now - s.at)) / DAY
      return since >= 0 && since < 6 ? acc + s.strength * Math.exp(-since * 0.9) : acc
    }, 0)
    const jitter = 0.82 + noise(seed, 'h', Math.floor(start / HOUR)) * 0.36
    const expected =
      baseHourly *
      hourOfDayFactor(date.getHours()) *
      weekdayFactor(date.getDay()) *
      trend *
      (1 + spike) *
      jitter *
      linkShare(start)
    const clicks = Math.max(0, Math.round(expected))

    const dayIndex = Math.floor(start / DAY)
    const weights = CHANNELS.map(
      (channel, c) =>
        CHANNEL_WEIGHTS[channel] *
        channelBias[c] *
        (0.85 + noise(seed, 'mix', channel, dayIndex) * 0.3),
    )
    const byChannel = apportion(clicks, weights)
    const uniqueRate = 0.68 + noise(seed, 'u', dayIndex) * 0.1
    samples.push({ start, clicks, unique: Math.round(clicks * uniqueRate), byChannel })
  }
  return samples
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0)
}

/** Ranked breakdown whose rows add up exactly to `total`, with a stable per-window wobble. */
function breakdown<T extends { key: string; weight: number }>(
  items: readonly T[],
  total: number,
  previousTotal: number,
  seed: string,
  label: (item: T) => string = (item) => item.key,
): (BreakdownRow & { item: T })[] {
  const weights = items.map((item) => item.weight * (0.8 + noise(seed, item.key) * 0.4))
  const previousWeights = items.map(
    (item) => item.weight * (0.8 + noise(seed, 'prev', item.key) * 0.4),
  )
  const current = apportion(total, weights)
  const previous = apportion(previousTotal, previousWeights)
  return items
    .map((item, i) => ({
      key: item.key,
      label: label(item),
      clicks: current[i],
      previousClicks: previous[i],
      share: total > 0 ? current[i] / total : 0,
      item,
    }))
    .sort((a, b) => b.clicks - a.clicks)
}

function strip<T extends { item: unknown }>(rows: T[]): Omit<T, 'item'>[] {
  return rows.map(({ item: _item, ...row }) => row)
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))

export type AnalyticsQuery = {
  orgId: string
  range: AnalyticsRange
  /** `null` means every link in the workspace. */
  linkId: string | null
  links: TrackedLink[]
  now?: number
}

/** Builds the full analytics report for one workspace, window, and link filter. */
export function buildAnalyticsReport(query: AnalyticsQuery): AnalyticsReport {
  const { orgId, range, linkId, links } = query
  const now = query.now ?? Date.now()
  const hours = RANGE_HOURS[range]
  const bucket: 'hour' | 'day' = hours <= 24 * 7 ? 'hour' : 'day'
  // Whole buckets only: the in-progress hour or day would read as a sudden drop.
  const end =
    bucket === 'hour'
      ? Math.floor(now / HOUR) * HOUR
      : new Date(new Date(now).setHours(0, 0, 0, 0)).getTime()
  const start = end - hours * HOUR
  const previousStart = start - hours * HOUR

  const weekly = demoStatsByOrg[orgId]?.clicksThisWeek ?? 8000
  const baseHourly = (weekly / (24 * 7)) * 1.35

  // Zipf-like link popularity, stable per workspace.
  const linkWeights = links.map(
    (link, i) => (1 / (i + 1) ** 0.85) * (0.75 + noise(orgId, link.id) * 0.5),
  )
  const linkWeightSum = sum(linkWeights) || 1
  const selectedIndex = linkId ? links.findIndex((l) => l.id === linkId) : -1
  const linkShare =
    selectedIndex >= 0
      ? (time: number) =>
          (linkWeights[selectedIndex] / linkWeightSum) *
          (0.8 + noise(orgId, linkId ?? '', Math.floor(time / DAY)) * 0.4)
      : () => 1
  const channelBias = CHANNELS.map((channel) =>
    selectedIndex >= 0 ? 0.6 + noise(orgId, linkId ?? '', channel) * 0.8 : 1,
  )

  const seed = `${orgId}:${linkId ?? 'all'}`
  const all = sampleHours(seed, now, baseHourly, previousStart, hours * 2, linkShare, channelBias)
  const previousHours = all.slice(0, hours)
  const currentHours = all.slice(hours)

  const bucketOf = (time: number) =>
    bucket === 'hour' ? time : new Date(new Date(time).setHours(0, 0, 0, 0)).getTime()

  // Aggregate into buckets.
  const buckets = new Map<number, { clicks: number; unique: number; byChannel: number[] }>()
  for (const h of currentHours) {
    const key = bucketOf(h.start)
    const entry = buckets.get(key) ?? { clicks: 0, unique: 0, byChannel: CHANNELS.map(() => 0) }
    entry.clicks += h.clicks
    entry.unique += h.unique
    h.byChannel.forEach((v, c) => (entry.byChannel[c] += v))
    buckets.set(key, entry)
  }
  const previousBuckets = new Map<number, number>()
  for (const h of previousHours) {
    const key = bucketOf(h.start + hours * HOUR)
    previousBuckets.set(key, (previousBuckets.get(key) ?? 0) + h.clicks)
  }

  const bucketKeys = [...buckets.keys()].sort((a, b) => a - b)
  const qrIndex = CHANNELS.indexOf('qr')
  const traffic: TrafficPoint[] = []
  const totalsSeries: TotalPoint[] = []
  for (const key of bucketKeys) {
    const entry = buckets.get(key)!
    const time = new Date(key)
    CHANNELS.forEach((channel, c) =>
      traffic.push({ time, channel: CHANNEL_LABELS[channel], clicks: entry.byChannel[c] }),
    )
    totalsSeries.push({
      time,
      clicks: entry.clicks,
      unique: entry.unique,
      qr: entry.byChannel[qrIndex],
    })
  }
  const previousSeries = bucketKeys.map((key) => ({
    time: new Date(key),
    clicks: previousBuckets.get(key) ?? 0,
  }))

  const totals = {
    clicks: sum(currentHours.map((h) => h.clicks)),
    unique: sum(currentHours.map((h) => h.unique)),
    qr: sum(currentHours.map((h) => h.byChannel[qrIndex])),
  }
  const previousTotals = {
    clicks: sum(previousHours.map((h) => h.clicks)),
    unique: sum(previousHours.map((h) => h.unique)),
    qr: sum(previousHours.map((h) => h.byChannel[qrIndex])),
  }

  // Weekday × hour heatmap; a single day is too thin, so 24h widens to 7 days.
  const heatHours = range === '24h' ? currentHours.concat(previousHours).slice(-24 * 7) : currentHours
  const heat = new Map<string, number>()
  for (const h of heatHours) {
    const date = new Date(h.start)
    const k = `${WEEKDAYS[date.getDay()]}|${HEATMAP_HOURS[date.getHours()]}`
    heat.set(k, (heat.get(k) ?? 0) + h.clicks)
  }
  const heatmap: HeatCell[] = HEATMAP_DAYS.flatMap((day) =>
    HEATMAP_HOURS.map((hour) => ({ day, hour, clicks: heat.get(`${day}|${hour}`) ?? 0 })),
  )

  // Channel totals over the window (also the stack legend order).
  const channelTotals = CHANNELS.map((_, c) => sum(currentHours.map((h) => h.byChannel[c])))
  const previousChannelTotals = CHANNELS.map((_, c) =>
    sum(previousHours.map((h) => h.byChannel[c])),
  )
  const channels: BreakdownRow[] = CHANNELS.map((channel, c) => ({
    key: channel,
    label: CHANNEL_LABELS[channel],
    clicks: channelTotals[c],
    previousClicks: previousChannelTotals[c],
    share: totals.clicks > 0 ? channelTotals[c] / totals.clicks : 0,
  })).sort((a, b) => b.clicks - a.clicks)

  // Referrers: each referrer belongs to a channel; Direct and QR have none.
  const windowSeed = `${seed}:${range}`
  const referrers: BreakdownRow[] = CHANNELS.filter((c) => c !== 'direct' && c !== 'qr')
    .flatMap((channel) => {
      const c = CHANNELS.indexOf(channel)
      return strip(
        breakdown(
          REFERRERS.filter((r) => r.channel === channel),
          channelTotals[c],
          previousChannelTotals[c],
          `${windowSeed}:ref:${channel}`,
        ),
      )
    })
    // Share of all clicks, not of the referrer's own channel.
    .map((row) => ({ ...row, share: totals.clicks > 0 ? row.clicks / totals.clicks : 0 }))
    .sort((a, b) => b.clicks - a.clicks)

  const countries: CountryRow[] = breakdown(
    COUNTRIES,
    totals.clicks,
    previousTotals.clicks,
    `${windowSeed}:geo`,
    (c) => c.label,
  ).map(({ item, ...row }) => ({ ...row, code: item.key, lat: item.lat, lng: item.lng }))

  const devices = strip(breakdown(DEVICES, totals.clicks, previousTotals.clicks, `${windowSeed}:dev`))
  const browsers = strip(breakdown(BROWSERS, totals.clicks, previousTotals.clicks, `${windowSeed}:br`))
  const operatingSystems = strip(
    breakdown(OPERATING_SYSTEMS, totals.clicks, previousTotals.clicks, `${windowSeed}:os`),
  )

  // Per-link table: the selected link alone, or every link's share of the total.
  const linkRows: LinkRow[] = (selectedIndex >= 0 ? [links[selectedIndex]] : links)
    .map((link) => {
      const i = links.indexOf(link)
      const share = selectedIndex >= 0 ? 1 : linkWeights[i] / linkWeightSum
      const wobble = 0.9 + noise(windowSeed, link.id) * 0.2
      // Links drift independently, so some rise and some fall between periods.
      const momentum = 0.55 + noise(orgId, link.id, 'momentum') * 0.9
      const clicks = Math.round(totals.clicks * share * wobble)
      const previousClicks = Math.round(previousTotals.clicks * share * wobble * momentum)
      const trend = totalsSeries.map((p, t) => ({
        time: p.time,
        value: Math.round(
          p.clicks * share * (0.75 + noise(windowSeed, link.id, t) * 0.5),
        ),
      }))
      const referrerPool = REFERRERS.filter(
        (r) => noise(orgId, link.id, r.key) > 0.35,
      )
      const topReferrer =
        noise(orgId, link.id, 'direct') < 0.3 || referrerPool.length === 0
          ? 'Direct'
          : referrerPool[Math.floor(noise(orgId, link.id, 'ref') * referrerPool.length)].key
      const topCountry =
        COUNTRIES[Math.floor(noise(orgId, link.id, 'geo') ** 2 * COUNTRIES.length)].label
      return {
        key: link.id,
        label: link.title,
        slug: link.slug,
        destination: link.destination,
        clicks,
        unique: Math.round(clicks * (totals.clicks ? totals.unique / totals.clicks : 0.7)),
        previousClicks,
        share: 0,
        topReferrer,
        topCountry,
        trend,
      }
    })
    .sort((a, b) => b.clicks - a.clicks)
  const linkClickSum = sum(linkRows.map((r) => r.clicks)) || 1
  linkRows.forEach((row) => (row.share = row.clicks / linkClickSum))

  // Destinations: several short links can point at the same page.
  const destinationMap = new Map<string, DestinationRow>()
  for (const row of linkRows) {
    const existing = destinationMap.get(row.destination)
    if (existing) {
      existing.clicks += row.clicks
      existing.previousClicks += row.previousClicks
      existing.linkCount += 1
      existing.slugs.push(row.slug)
    } else {
      let host = row.destination
      let label = row.destination
      try {
        const url = new URL(row.destination)
        host = url.hostname
        label = `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
      } catch {
        // Keep the raw value for malformed destinations.
      }
      destinationMap.set(row.destination, {
        key: row.destination,
        label,
        url: row.destination,
        host,
        clicks: row.clicks,
        previousClicks: row.previousClicks,
        share: 0,
        linkCount: 1,
        slugs: [row.slug],
      })
    }
  }
  const destinations = [...destinationMap.values()].sort((a, b) => b.clicks - a.clicks)
  destinations.forEach((row) => (row.share = row.clicks / linkClickSum))

  const change = (row: LinkRow) =>
    row.previousClicks > 0 ? (row.clicks - row.previousClicks) / row.previousClicks : 0
  const byChange = [...linkRows].sort((a, b) => change(b) - change(a))
  const movers = {
    rising: byChange.filter((r) => change(r) > 0.02).slice(0, 3),
    falling: byChange.filter((r) => change(r) < -0.02).reverse().slice(0, 3),
  }

  // Cities inside each country, so totals reconcile with the country table.
  const cities: CityRow[] = countries
    .flatMap((country) => {
      const pool = CITIES.filter((c) => c.country === country.code)
      const parts = apportion(
        country.clicks,
        pool.map((c) => c.weight * (0.8 + noise(windowSeed, 'city', c.key) * 0.4)),
      )
      return pool.map((c, i) => ({
        key: `${country.code}-${c.key}`,
        label: c.key,
        country: country.label,
        clicks: parts[i],
      }))
    })
    .sort((a, b) => b.clicks - a.clicks)

  return {
    range,
    bucket,
    windowStart: new Date(start),
    windowEnd: new Date(end - 1),
    totals,
    previousTotals,
    traffic,
    totalsSeries,
    previousSeries,
    heatmap,
    heatmapDays: HEATMAP_DAYS,
    heatmapHours: HEATMAP_HOURS,
    heatmapWindowLabel: range === '24h' ? 'Last 7 days' : `Last ${range.replace('d', ' days')}`,
    links: linkRows,
    destinations,
    movers,
    channels,
    referrers,
    countries,
    cities,
    devices,
    browsers,
    operatingSystems,
  }
}
