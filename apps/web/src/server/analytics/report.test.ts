import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { link, linkClick } from '@openlink/db/schema'
import { Effect } from 'effect'

import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { AnalyticsReports, AnalyticsSummaries, AnalyticsWindow, RecentClicks } from './report'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

const HOUR = 3_600_000
// A Wednesday, 10:30 UTC.
const NOW = new Date('2026-11-18T10:30:00.000Z')

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const seedLink = (id: string, slug: string, destinationUrl: string) =>
    adapter.insert(link).values({ id, organizationId: 'o1', slug, destinationUrl, title: slug, createdAt: NOW, updatedAt: NOW }).run()
  let n = 0
  const click = (at: Date, overrides: Partial<typeof linkClick.$inferInsert> = {}) =>
    adapter
      .insert(linkClick)
      .values({
        id: `c${n++}`,
        organizationId: 'o1',
        linkId: 'l1',
        occurredAt: at,
        visitorHash: 'v1',
        channel: 'direct',
        device: 'desktop',
        browser: 'Chrome',
        os: 'macOS',
        delivery: 'redirect',
        ...overrides,
      })
      .run()
  const run = <A, E>(effect: Effect.Effect<A, E, Db>) => Effect.runPromise(effect.pipe(Effect.provideService(Db, db)))
  return { seedLink, click, run }
}

describe('AnalyticsWindow', () => {
  test('ends with the bucket in progress, in the viewer clock', () => {
    const hourly = AnalyticsWindow.of('24h', NOW)
    expect(new Date(hourly.end).toISOString()).toBe('2026-11-18T11:00:00.000Z')
    expect(hourly.bucketStarts()).toHaveLength(24)
    // UTC+6: the 18th ends at 18:00 UTC on the 18th.
    const daily = AnalyticsWindow.of('30d', NOW, 360)
    expect(new Date(daily.end).toISOString()).toBe('2026-11-18T18:00:00.000Z')
    expect(daily.bucketStarts()).toHaveLength(30)
  })
})

describe('AnalyticsReports', () => {
  test('counts the window and the previous one, with uniques, QR and breakdowns', async () => {
    const t = setup()
    t.seedLink('l1', 'launch', 'https://example.com/launch')
    t.seedLink('l2', 'docs', 'https://example.com/launch')
    const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * HOUR)
    t.click(at(2), { country: 'BD', city: 'Dhaka', latitude: 23.8, longitude: 90.4, channel: 'social', referrerHost: 't.co', device: 'mobile' })
    t.click(at(3), { visitorHash: 'v2', country: 'BD', city: 'Dhaka', latitude: 23.6, longitude: 90.2, channel: 'qr', device: 'mobile' })
    t.click(at(5), { linkId: 'l2', visitorHash: 'v3', country: 'DE', channel: 'search', referrerHost: 'google.com' })
    // Previous window (about 24–48h ago) and outside both.
    t.click(at(30))
    t.click(at(60))
    // A click minutes ago counts at once.
    t.click(new Date(NOW.getTime() - 60_000), { linkId: 'l2', visitorHash: 'v4', country: 'DE' })

    const report = await t.run(AnalyticsReports.build({ organizationId: 'o1' }, '24h', 0, NOW))
    expect(report.totals).toEqual({ clicks: 4, unique: 4, qr: 1 })
    expect(report.previousTotals).toEqual({ clicks: 1, unique: 1, qr: 0 })
    expect(report.totalsSeries).toHaveLength(24)
    expect(report.totalsSeries.reduce((sum, p) => sum + p.clicks, 0)).toBe(4)
    expect(report.previousSeries.reduce((sum, p) => sum + p.clicks, 0)).toBe(1)
    expect(report.traffic).toHaveLength(24 * 6)

    expect(report.channels.map((c) => [c.key, c.clicks])).toEqual([
      ['direct', 1],
      ['qr', 1],
      ['search', 1],
      ['social', 1],
    ])
    expect(report.referrers.map((r) => r.key).sort()).toEqual(['google.com', 't.co'])
    expect(report.countries[0]).toMatchObject({ key: 'BD', label: 'Bangladesh', clicks: 2 })
    expect(report.countries[0]!.lat).toBeCloseTo(23.7)
    expect(report.countries[0]!.lng).toBeCloseTo(90.3)
    expect(report.countries[1]).not.toHaveProperty('lat')
    expect(report.cities).toEqual([{ key: 'BD-Dhaka', label: 'Dhaka', country: 'Bangladesh', clicks: 2 }])
    expect(report.devices.map((d) => [d.label, d.clicks])).toEqual([
      ['Desktop', 2],
      ['Mobile', 2],
    ])
    expect(report.links.map((l) => [l.slug, l.clicks])).toEqual([
      ['launch', 2],
      ['docs', 2],
    ])
    // Two links to one page are one destination.
    expect(report.destinations).toHaveLength(1)
    expect(report.destinations[0]).toMatchObject({ clicks: 4, linkCount: 2, slugs: ['launch', 'docs'] })
    expect(report.heatmapDays).toBe(7)
  })

  test('scopes to one link and to the workspace', async () => {
    const t = setup()
    t.seedLink('l1', 'launch', 'https://example.com/')
    t.click(new Date(NOW.getTime() - 2 * HOUR))
    t.click(new Date(NOW.getTime() - 2 * HOUR), { linkId: 'l2' })
    t.click(new Date(NOW.getTime() - 2 * HOUR), { organizationId: 'o2' })
    expect((await t.run(AnalyticsReports.build({ organizationId: 'o1', linkId: 'l1' }, '7d', 0, NOW))).totals.clicks).toBe(1)
    expect((await t.run(AnalyticsReports.build({ organizationId: 'o1' }, '7d', 0, NOW))).totals.clicks).toBe(2)
  })

  test('the heatmap uses the viewer clock', async () => {
    const t = setup()
    t.seedLink('l1', 'launch', 'https://example.com/')
    // Tuesday 22:00 UTC is Wednesday 04:00 at UTC+6.
    t.click(new Date('2026-11-17T22:00:00.000Z'))
    const report = await t.run(AnalyticsReports.build({ organizationId: 'o1' }, '7d', 360, NOW))
    expect(report.heatmap).toEqual([{ weekday: 3, hour: 4, clicks: 1 }])
  })
})

describe('AnalyticsSummaries', () => {
  test('today, the last 7 days, unique visitors and the top referrer', async () => {
    const t = setup()
    t.seedLink('l1', 'launch', 'https://example.com/')
    t.click(new Date('2026-11-18T09:00:00.000Z'), { referrerHost: 't.co' })
    t.click(new Date('2026-11-17T09:00:00.000Z'), { referrerHost: 't.co', visitorHash: 'v2' })
    t.click(new Date('2026-11-16T09:00:00.000Z'), { referrerHost: 'google.com' })
    t.click(new Date('2026-11-01T09:00:00.000Z'))
    expect(await t.run(AnalyticsSummaries.build('o1', 0, NOW))).toEqual({
      clicksToday: 1,
      clicksThisWeek: 3,
      uniqueVisitorsWeek: 2,
      topReferrer: 't.co',
    })
  })
})

describe('RecentClicks', () => {
  test('newest first, with the link, and scoped like reports', async () => {
    const t = setup()
    t.seedLink('l1', 'launch', 'https://example.com/')
    t.click(new Date('2026-11-18T09:00:00.000Z'), { city: 'Dhaka', country: 'BD' })
    t.click(new Date('2026-11-18T10:00:00.000Z'), { referrerHost: 't.co', channel: 'social' })
    t.click(new Date('2026-11-18T10:05:00.000Z'), { organizationId: 'o2' })
    const { items } = await t.run(RecentClicks.list({ organizationId: 'o1' }, 10))
    expect(items.map((c) => c.occurredAt)).toEqual(['2026-11-18T10:00:00.000Z', '2026-11-18T09:00:00.000Z'])
    expect(items[0]).toMatchObject({ link: { id: 'l1', slug: 'launch', title: 'launch' }, channel: 'social', referrerHost: 't.co' })
    expect(items[1]).toMatchObject({ country: 'BD', city: 'Dhaka' })
    expect(JSON.stringify(items)).not.toContain('visitor')
  })
})
