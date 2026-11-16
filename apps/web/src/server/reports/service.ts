import { link, linkClick } from '@openlink/db/schema'
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm'
import { Effect } from 'effect'

import { AnalyticsReports, AnalyticsWindow, type Scope } from '#/server/analytics/report'
import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { Csv } from './csv'

/** A calendar month, e.g. "2026-11". */
export type ReportMonth = { year: number; monthIndex: number }

export type ReportQuery = {
  organizationId: string
  month: string
  tzOffsetMinutes: number
  /** A UTM campaign set on links; absent for every link. */
  campaign?: string
}

/** The most rows one CSV download will hold. */
export const MAX_EXPORT_ROWS = 50_000

/**
 * Reports: a calendar month's summary, the same for one UTM campaign, and CSV
 * exports of either. Campaigns come from the links' UTM settings (clicks don't
 * store them), so a link's clicks follow its current campaign.
 */
export class Reports {
  static parseMonth(month: string): ReportMonth {
    const [year, monthNumber] = month.split('-').map(Number)
    return { year: year!, monthIndex: monthNumber! - 1 }
  }

  static window(query: ReportQuery): AnalyticsWindow {
    const { year, monthIndex } = Reports.parseMonth(query.month)
    return AnalyticsWindow.month(year, monthIndex, query.tzOffsetMinutes)
  }

  private static campaignOf = sql<string | null>`json_extract(${link.utmJson}, '$.campaign')`

  /** Campaign names used on the workspace's links, with how many links use each. */
  static campaigns(organizationId: string) {
    return Effect.gen(function* () {
      const db = yield* Db
      const rows = yield* operation('reports.campaigns', () =>
        db
          .select({ campaign: Reports.campaignOf, links: sql<number>`count(*)` })
          .from(link)
          .where(and(eq(link.organizationId, organizationId), sql`coalesce(${Reports.campaignOf}, '') <> ''`))
          .groupBy(Reports.campaignOf)
          .orderBy(Reports.campaignOf),
      )
      return rows.map((row) => ({ name: String(row.campaign), links: Number(row.links) }))
    })
  }

  /** Who the report covers: the whole workspace, or the links in one campaign. */
  static scope(organizationId: string, campaign?: string) {
    return Effect.gen(function* () {
      if (!campaign) return { organizationId } satisfies Scope
      const db = yield* Db
      const rows = yield* operation('reports.campaignLinks', () =>
        db
          .select({ id: link.id })
          .from(link)
          .where(and(eq(link.organizationId, organizationId), eq(Reports.campaignOf, campaign))),
      )
      return { organizationId, linkIds: rows.map((row) => row.id) } satisfies Scope
    })
  }

  /** The month's analytics (vs the month before) and how many links were created in it. */
  static monthly(query: ReportQuery) {
    return Effect.gen(function* () {
      const db = yield* Db
      const window = Reports.window(query)
      const scope = yield* Reports.scope(query.organizationId, query.campaign)
      const report = yield* AnalyticsReports.buildFor(scope, window)
      const [created] = yield* operation('reports.newLinks', () =>
        db
          .select({ count: sql<number>`count(*)` })
          .from(link)
          .where(
            and(
              eq(link.organizationId, query.organizationId),
              query.campaign ? eq(Reports.campaignOf, query.campaign) : undefined,
              gte(link.createdAt, new Date(window.start)),
              lt(link.createdAt, new Date(window.end)),
            ),
          ),
      )
      return {
        month: query.month,
        ...(query.campaign ? { campaign: query.campaign } : {}),
        newLinks: Number(created?.count ?? 0),
        ...(scope.linkIds ? { linkCount: scope.linkIds.length } : {}),
        report,
      }
    })
  }

  /** One row per click in the month, newest first. No IPs or visitor ids: they are never stored. */
  static clicksCsv(query: ReportQuery) {
    return Effect.gen(function* () {
      const db = yield* Db
      const window = Reports.window(query)
      const scope = yield* Reports.scope(query.organizationId, query.campaign)
      const rows = yield* operation('reports.exportClicks', () =>
        db
          .select({
            occurredAt: linkClick.occurredAt,
            slug: link.slug,
            title: link.title,
            destination: link.destinationUrl,
            campaign: Reports.campaignOf,
            channel: linkClick.channel,
            referrer: linkClick.referrerHost,
            country: linkClick.country,
            city: linkClick.city,
            device: linkClick.device,
            browser: linkClick.browser,
            os: linkClick.os,
          })
          .from(linkClick)
          .innerJoin(link, eq(link.id, linkClick.linkId))
          .where(AnalyticsReports.where(scope, window.start, window.end))
          .orderBy(desc(linkClick.occurredAt), desc(linkClick.id))
          .limit(MAX_EXPORT_ROWS),
      )
      return Csv.build(
        ['time_utc', 'slug', 'title', 'destination', 'campaign', 'channel', 'referrer', 'country', 'city', 'device', 'browser', 'os'],
        rows.map((r) => [r.occurredAt, r.slug, r.title, r.destination, r.campaign, r.channel, r.referrer, r.country, r.city, r.device, r.browser, r.os]),
      )
    })
  }

  /** One row per link that got clicks in the month, most clicked first. */
  static linksCsv(query: ReportQuery) {
    return Effect.gen(function* () {
      const db = yield* Db
      const window = Reports.window(query)
      const scope = yield* Reports.scope(query.organizationId, query.campaign)
      const clicks = sql<number>`count(*)`
      const rows = yield* operation('reports.exportLinks', () =>
        db
          .select({
            slug: link.slug,
            title: link.title,
            destination: link.destinationUrl,
            campaign: Reports.campaignOf,
            clicks,
            unique: sql<number>`count(distinct ${linkClick.visitorHash})`,
            qr: sql<number>`sum(case when ${linkClick.channel} = 'qr' then 1 else 0 end)`,
            firstClick: sql<number>`min(${linkClick.occurredAt})`,
            lastClick: sql<number>`max(${linkClick.occurredAt})`,
          })
          .from(linkClick)
          .innerJoin(link, eq(link.id, linkClick.linkId))
          .where(AnalyticsReports.where(scope, window.start, window.end))
          .groupBy(link.id)
          .orderBy(desc(clicks))
          .limit(MAX_EXPORT_ROWS),
      )
      const iso = (ms: number | null) => (ms == null ? '' : new Date(Number(ms)).toISOString())
      return Csv.build(
        ['slug', 'title', 'destination', 'campaign', 'clicks', 'unique_visitors', 'qr_scans', 'first_click_utc', 'last_click_utc'],
        rows.map((r) => [r.slug, r.title, r.destination, r.campaign, Number(r.clicks), Number(r.unique), Number(r.qr ?? 0), iso(r.firstClick), iso(r.lastClick)]),
      )
    })
  }
}
