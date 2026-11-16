import type { AnalyticsRange, AnalyticsReport, ClickChannel } from '@openlink/contracts'
import { link, linkClick } from '@openlink/db/schema'
import { and, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm'
import { Effect } from 'effect'

import { countryName } from '#/lib/links/countries'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** The time window a report covers, aligned to whole buckets in the viewer's clock. */
export class AnalyticsWindow {
  static readonly HOURS: Record<AnalyticsRange, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30, '90d': 24 * 90 }

  private constructor(
    readonly range: AnalyticsRange,
    readonly bucket: 'hour' | 'day',
    /** Viewer's UTC offset in ms. */
    readonly offset: number,
    readonly start: number,
    readonly end: number,
  ) {}

  /**
   * `range` worth of whole buckets ending with the one in progress, so a click
   * shows up the moment it happens.
   */
  static of(range: AnalyticsRange, now: Date, tzOffsetMinutes = 0): AnalyticsWindow {
    const hours = AnalyticsWindow.HOURS[range]
    const bucket = hours <= 24 * 7 ? 'hour' : 'day'
    const offset = tzOffsetMinutes * 60_000
    const size = bucket === 'hour' ? HOUR : DAY
    const end = (Math.floor((now.getTime() + offset) / size) + 1) * size - offset
    return new AnalyticsWindow(range, bucket, offset, end - hours * HOUR, end)
  }

  get length() {
    return this.end - this.start
  }
  get previousStart() {
    return this.start - this.length
  }
  get bucketSize() {
    return this.bucket === 'hour' ? HOUR : DAY
  }

  /** Every bucket start in the window, oldest first. */
  bucketStarts(): number[] {
    const starts: number[] = []
    for (let t = this.start; t < this.end; t += this.bucketSize) starts.push(t)
    return starts
  }

  /** The weekday-by-hour grid needs at least a week to say anything. */
  get heatmapStart() {
    return Math.min(this.start, this.end - 7 * DAY)
  }
}

type Scope = { organizationId: string; linkId?: string }

/** Breakdowns keep the previous period's count beside the current one. */
type Counted = { key: string; current: number; previous: number }

/** Workspace or link analytics from the stored clicks. */
export class AnalyticsReports {
  static build(scope: Scope, range: AnalyticsRange, tzOffsetMinutes = 0, now = new Date()) {
    return Effect.gen(function* () {
      const db = yield* Db
      const window = AnalyticsWindow.of(range, now, tzOffsetMinutes)
      const inWindow = AnalyticsReports.where(scope, window.previousStart, window.end)
      const isCurrent = sql<number>`case when ${linkClick.occurredAt} >= ${window.start} then 1 else 0 end`
      // D1 binds JS numbers as REAL, so cast: integer division is what makes buckets.
      const bucketOf = sql<number>`cast((${linkClick.occurredAt} + ${window.offset}) / ${window.bucketSize} as integer)`

      const query = <T>(name: string, run: () => Promise<T>) => operation(`analytics.${name}`, run)

      const [series, channelSeries, totals, dims, places, cities, heat] = yield* Effect.all([
        query('series', () =>
          db
            .select({
              bucket: bucketOf,
              current: isCurrent,
              clicks: sql<number>`count(*)`,
              unique: sql<number>`count(distinct ${linkClick.visitorHash})`,
              qr: sql<number>`sum(case when ${linkClick.channel} = 'qr' then 1 else 0 end)`,
            })
            .from(linkClick)
            .where(inWindow)
            .groupBy(bucketOf, isCurrent),
        ),
        query('channelSeries', () =>
          db
            .select({ bucket: bucketOf, channel: linkClick.channel, clicks: sql<number>`count(*)` })
            .from(linkClick)
            .where(AnalyticsReports.where(scope, window.start, window.end))
            .groupBy(bucketOf, linkClick.channel),
        ),
        query('totals', () =>
          db
            .select({
              current: isCurrent,
              clicks: sql<number>`count(*)`,
              unique: sql<number>`count(distinct ${linkClick.visitorHash})`,
              qr: sql<number>`sum(case when ${linkClick.channel} = 'qr' then 1 else 0 end)`,
            })
            .from(linkClick)
            .where(inWindow)
            .groupBy(isCurrent),
        ),
        query('dimensions', () =>
          Promise.all(
            (['channel', 'referrerHost', 'device', 'browser', 'os', 'linkId'] as const).map(async (dimension) => {
              const column = linkClick[dimension]
              const rows = await db
                .select({ key: column, current: isCurrent, clicks: sql<number>`count(*)` })
                .from(linkClick)
                .where(inWindow)
                .groupBy(column, isCurrent)
              return [dimension, AnalyticsReports.counted(rows)] as const
            }),
          ),
        ),
        query('countries', () =>
          db
            .select({
              key: linkClick.country,
              current: isCurrent,
              clicks: sql<number>`count(*)`,
              lat: sql<number | null>`avg(${linkClick.latitude})`,
              lng: sql<number | null>`avg(${linkClick.longitude})`,
            })
            .from(linkClick)
            .where(inWindow)
            .groupBy(linkClick.country, isCurrent),
        ),
        query('cities', () =>
          db
            .select({ city: linkClick.city, country: linkClick.country, clicks: sql<number>`count(*)` })
            .from(linkClick)
            .where(and(AnalyticsReports.where(scope, window.start, window.end), sql`${linkClick.city} is not null`))
            .groupBy(linkClick.city, linkClick.country)
            .orderBy(sql`count(*) desc`)
            .limit(50),
        ),
        query('heatmap', () => {
          const local = sql`(${linkClick.occurredAt} + ${window.offset}) / 1000`
          const weekday = sql<number>`cast(strftime('%w', ${local}, 'unixepoch') as integer)`
          const hour = sql<number>`cast(strftime('%H', ${local}, 'unixepoch') as integer)`
          return db
            .select({ weekday, hour, clicks: sql<number>`count(*)` })
            .from(linkClick)
            .where(AnalyticsReports.where(scope, window.heatmapStart, window.end))
            .groupBy(weekday, hour)
        }),
      ])

      const dimension = Object.fromEntries(dims) as Record<(typeof dims)[number][0], Counted[]>
      const linkIds = dimension.linkId.map((row) => row.key)
      const linkRows = linkIds.length
        ? yield* query('links', () =>
            db
              .select({ id: link.id, slug: link.slug, title: link.title, destinationUrl: link.destinationUrl })
              .from(link)
              .where(and(eq(link.organizationId, scope.organizationId), inArray(link.id, linkIds))),
          )
        : []

      return AnalyticsReports.assemble({ window, series, channelSeries, totals, dimension, places, cities, heat, linkRows })
    })
  }

  /** Clicks of this scope with `occurredAt` in [from, to). */
  static where(scope: Scope, from: number, to: number): SQL {
    return and(
      eq(linkClick.organizationId, scope.organizationId),
      scope.linkId ? eq(linkClick.linkId, scope.linkId) : undefined,
      gte(linkClick.occurredAt, new Date(from)),
      lt(linkClick.occurredAt, new Date(to)),
    )!
  }

  private static counted(rows: { key: string | null; current: number; clicks: number }[]): Counted[] {
    const byKey = new Map<string, Counted>()
    for (const row of rows) {
      const key = row.key ?? ''
      const entry = byKey.get(key) ?? { key, current: 0, previous: 0 }
      if (row.current) entry.current += Number(row.clicks)
      else entry.previous += Number(row.clicks)
      byKey.set(key, entry)
    }
    // Ties sort by key so the order is stable between requests.
    return [...byKey.values()].filter((row) => row.current > 0).sort((a, b) => b.current - a.current || a.key.localeCompare(b.key))
  }

  private static assemble(input: {
    window: AnalyticsWindow
    series: { bucket: number; current: number; clicks: number; unique: number; qr: number | null }[]
    channelSeries: { bucket: number; channel: string; clicks: number }[]
    totals: { current: number; clicks: number; unique: number; qr: number | null }[]
    dimension: Record<'channel' | 'referrerHost' | 'device' | 'browser' | 'os' | 'linkId', Counted[]>
    places: { key: string | null; current: number; clicks: number; lat: number | null; lng: number | null }[]
    cities: { city: string | null; country: string | null; clicks: number }[]
    heat: { weekday: number; hour: number; clicks: number }[]
    linkRows: { id: string; slug: string; title: string | null; destinationUrl: string }[]
  }): AnalyticsReport {
    const { window } = input
    const iso = (t: number) => new Date(t).toISOString()
    const startOf = (bucket: number) => Math.floor(Number(bucket)) * window.bucketSize - window.offset

    const total = (current: number) => {
      const row = input.totals.find((r) => Number(r.current) === current)
      return { clicks: Number(row?.clicks ?? 0), unique: Number(row?.unique ?? 0), qr: Number(row?.qr ?? 0) }
    }
    const totals = total(1)
    const previousTotals = total(0)
    const share = (clicks: number) => (totals.clicks > 0 ? clicks / totals.clicks : 0)
    const row = (counted: Counted, label: string) => ({
      key: counted.key,
      label,
      clicks: counted.current,
      previousClicks: counted.previous,
      share: share(counted.current),
    })

    const current = new Map<number, { clicks: number; unique: number; qr: number }>()
    const previous = new Map<number, number>()
    for (const point of input.series) {
      const start = startOf(point.bucket)
      if (Number(point.current)) {
        current.set(start, { clicks: Number(point.clicks), unique: Number(point.unique), qr: Number(point.qr ?? 0) })
      } else {
        // Shift the previous window onto this one's time axis.
        previous.set(start + window.length, (previous.get(start + window.length) ?? 0) + Number(point.clicks))
      }
    }
    const byChannel = new Map<string, number>()
    for (const point of input.channelSeries) byChannel.set(`${startOf(point.bucket)}|${point.channel}`, Number(point.clicks))

    const starts = window.bucketStarts()
    const channels = AnalyticsReports.CHANNELS
    const links = new Map(input.linkRows.map((l) => [l.id, l]))

    const linkRows = input.dimension.linkId.flatMap((counted) => {
      const found = links.get(counted.key)
      return found ? [{ ...row(counted, found.title || `/${found.slug}`), slug: found.slug, destination: found.destinationUrl }] : []
    })
    const destinations = new Map<string, AnalyticsReport['destinations'][number]>()
    for (const linkRow of linkRows) {
      const existing = destinations.get(linkRow.destination)
      if (existing) {
        existing.clicks += linkRow.clicks
        existing.previousClicks += linkRow.previousClicks
        existing.share = share(existing.clicks)
        existing.linkCount += 1
        existing.slugs.push(linkRow.slug)
        continue
      }
      const { host, label } = AnalyticsReports.describeUrl(linkRow.destination)
      destinations.set(linkRow.destination, {
        key: linkRow.destination,
        label,
        url: linkRow.destination,
        host,
        clicks: linkRow.clicks,
        previousClicks: linkRow.previousClicks,
        share: linkRow.share,
        linkCount: 1,
        slugs: [linkRow.slug],
      })
    }

    const countryCounts = AnalyticsReports.counted(input.places)
    const coordinates = new Map(
      input.places.filter((p) => Number(p.current) && p.lat != null && p.lng != null).map((p) => [p.key ?? '', { lat: Number(p.lat), lng: Number(p.lng) }]),
    )

    return {
      range: window.range,
      bucket: window.bucket,
      windowStart: iso(window.start),
      windowEnd: iso(window.end - 1),
      totals,
      previousTotals,
      traffic: starts.flatMap((start) =>
        channels.map((channel) => ({ time: iso(start), channel, clicks: byChannel.get(`${start}|${channel}`) ?? 0 })),
      ),
      totalsSeries: starts.map((start) => ({ time: iso(start), ...(current.get(start) ?? { clicks: 0, unique: 0, qr: 0 }) })),
      previousSeries: starts.map((start) => ({ time: iso(start), clicks: previous.get(start) ?? 0 })),
      heatmap: input.heat.map((cell) => ({ weekday: Number(cell.weekday), hour: Number(cell.hour), clicks: Number(cell.clicks) })),
      heatmapDays: Math.round((window.end - window.heatmapStart) / DAY),
      links: linkRows,
      destinations: [...destinations.values()].sort((a, b) => b.clicks - a.clicks),
      channels: input.dimension.channel
        .filter((c): c is Counted & { key: ClickChannel } => (channels as readonly string[]).includes(c.key))
        .map((c) => ({ ...row(c, AnalyticsReports.CHANNEL_LABELS[c.key]), key: c.key })),
      // Direct clicks have no referrer; they are the "direct" channel instead.
      referrers: input.dimension.referrerHost.filter((r) => r.key).map((r) => row(r, r.key)),
      countries: countryCounts
        .filter((c) => c.key)
        .map((c) => ({ ...row(c, countryName(c.key) || c.key), ...coordinates.get(c.key) })),
      cities: input.cities
        .filter((c) => c.city)
        .map((c) => ({
          key: `${c.country ?? ''}-${c.city}`,
          label: c.city!,
          country: c.country ? countryName(c.country) || c.country : '',
          clicks: Number(c.clicks),
        })),
      devices: input.dimension.device.map((d) => row(d, AnalyticsReports.DEVICE_LABELS[d.key] ?? d.key)),
      browsers: input.dimension.browser.map((b) => row(b, b.key)),
      operatingSystems: input.dimension.os.map((o) => row(o, o.key)),
    }
  }

  static readonly CHANNELS = ['direct', 'social', 'search', 'email', 'qr', 'referral'] as const satisfies readonly ClickChannel[]

  static readonly CHANNEL_LABELS: Record<ClickChannel, string> = {
    direct: 'Direct',
    social: 'Social',
    search: 'Search',
    email: 'Email',
    qr: 'QR scans',
    referral: 'Other sites',
  }

  static readonly DEVICE_LABELS: Record<string, string> = { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop' }

  private static describeUrl(url: string) {
    try {
      const parsed = new URL(url)
      return { host: parsed.hostname, label: `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}` }
    } catch {
      return { host: url, label: url }
    }
  }
}

/** The overview tiles. */
export class AnalyticsSummaries {
  static build(organizationId: string, tzOffsetMinutes = 0, now = new Date()) {
    return Effect.gen(function* () {
      const db = yield* Db
      const offset = tzOffsetMinutes * 60_000
      const today = Math.floor((now.getTime() + offset) / DAY) * DAY - offset
      const weekStart = now.getTime() - 7 * DAY
      const scope = { organizationId }
      const [[week], [day], [top]] = yield* Effect.all([
        operation('analytics.summary.week', () =>
          db
            .select({ clicks: sql<number>`count(*)`, unique: sql<number>`count(distinct ${linkClick.visitorHash})` })
            .from(linkClick)
            .where(AnalyticsReports.where(scope, weekStart, now.getTime() + 1)),
        ),
        operation('analytics.summary.today', () =>
          db.select({ clicks: sql<number>`count(*)` }).from(linkClick).where(AnalyticsReports.where(scope, today, now.getTime() + 1)),
        ),
        operation('analytics.summary.referrer', () =>
          db
            .select({ host: linkClick.referrerHost })
            .from(linkClick)
            .where(and(AnalyticsReports.where(scope, weekStart, now.getTime() + 1), sql`${linkClick.referrerHost} is not null`))
            .groupBy(linkClick.referrerHost)
            .orderBy(sql`count(*) desc`)
            .limit(1),
        ),
      ])
      return {
        clicksToday: Number(day?.clicks ?? 0),
        clicksThisWeek: Number(week?.clicks ?? 0),
        uniqueVisitorsWeek: Number(week?.unique ?? 0),
        ...(top?.host ? { topReferrer: top.host } : {}),
      }
    })
  }
}
