import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { link, linkClick } from '@openlink/db/schema'
import { Effect } from 'effect'

import { AnalyticsWindow } from '#/server/analytics/report'
import { Db } from '#/server/effect/services/db'
import { createTestDatabase } from '#/server/testing/sqlite'
import { Csv } from './csv'
import { Reports } from './service'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const seedLink = (id: string, slug: string, options: { campaign?: string; createdAt?: Date; title?: string } = {}) =>
    adapter
      .insert(link)
      .values({
        id,
        organizationId: 'o1',
        slug,
        destinationUrl: `https://example.com/${slug}`,
        title: options.title ?? slug,
        utmJson: options.campaign ? JSON.stringify({ source: 'news', campaign: options.campaign }) : null,
        createdAt: options.createdAt ?? new Date('2026-10-01T00:00:00Z'),
        updatedAt: new Date('2026-10-01T00:00:00Z'),
      })
      .run()
  let n = 0
  const click = (linkId: string, at: string, overrides: Partial<typeof linkClick.$inferInsert> = {}) =>
    adapter
      .insert(linkClick)
      .values({
        id: `c${n++}`,
        organizationId: 'o1',
        linkId,
        occurredAt: new Date(at),
        visitorHash: `v${n}`,
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

describe('AnalyticsWindow.month', () => {
  test('is the calendar month on the viewer clock, compared with the month before', () => {
    // UTC+6: November starts at 18:00 UTC on Oct 31.
    const window = AnalyticsWindow.month(2026, 10, 360)
    expect(new Date(window.start).toISOString()).toBe('2026-10-31T18:00:00.000Z')
    expect(new Date(window.end).toISOString()).toBe('2026-11-30T18:00:00.000Z')
    expect(new Date(window.previousStart).toISOString()).toBe('2026-09-30T18:00:00.000Z')
    expect(window.bucketStarts()).toHaveLength(30)
    // January compares with December of the year before.
    expect(new Date(AnalyticsWindow.month(2027, 0).previousStart).toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })
})

describe('Reports', () => {
  test('a month counts its own clicks and compares with the previous month', async () => {
    const t = setup()
    t.seedLink('l1', 'launch', { createdAt: new Date('2026-11-03T00:00:00Z') })
    t.click('l1', '2026-11-02T12:00:00Z')
    t.click('l1', '2026-11-30T23:59:00Z')
    t.click('l1', '2026-10-15T12:00:00Z')
    t.click('l1', '2026-12-01T00:00:00Z')
    const monthly = await t.run(Reports.monthly({ organizationId: 'o1', month: '2026-11', tzOffsetMinutes: 0 }))
    expect(monthly.report.range).toBe('month')
    expect(monthly.report.totals.clicks).toBe(2)
    expect(monthly.report.previousTotals.clicks).toBe(1)
    expect(monthly.newLinks).toBe(1)
    // October's click sits on November's axis, on the same day of the month.
    expect(monthly.report.previousSeries.find((p) => p.clicks > 0)?.time).toBe('2026-11-15T00:00:00.000Z')
  })

  test('a campaign covers only the links that carry it', async () => {
    const t = setup()
    t.seedLink('l1', 'spring-a', { campaign: 'spring', createdAt: new Date('2026-11-05T00:00:00Z') })
    t.seedLink('l2', 'spring-b', { campaign: 'spring' })
    t.seedLink('l3', 'other', { campaign: 'autumn', createdAt: new Date('2026-11-05T00:00:00Z') })
    t.click('l1', '2026-11-10T00:00:00Z')
    t.click('l2', '2026-11-11T00:00:00Z')
    t.click('l3', '2026-11-12T00:00:00Z')
    const monthly = await t.run(Reports.monthly({ organizationId: 'o1', month: '2026-11', tzOffsetMinutes: 0, campaign: 'spring' }))
    expect(monthly).toMatchObject({ campaign: 'spring', linkCount: 2, newLinks: 1 })
    expect(monthly.report.totals.clicks).toBe(2)
    expect(await t.run(Reports.campaigns('o1'))).toEqual([
      { name: 'autumn', links: 1 },
      { name: 'spring', links: 2 },
    ])
    const none = await t.run(Reports.monthly({ organizationId: 'o1', month: '2026-11', tzOffsetMinutes: 0, campaign: 'missing' }))
    expect(none.report.totals.clicks).toBe(0)
  })

  test('CSV exports list clicks and per-link totals for the month', async () => {
    const t = setup()
    t.seedLink('l1', 'launch', { campaign: 'spring', title: '=HYPERLINK("evil")' })
    t.click('l1', '2026-11-02T12:00:00Z', { channel: 'qr', country: 'BD', city: 'Dhaka' })
    t.click('l1', '2026-11-03T12:00:00Z', { visitorHash: 'same' })
    t.click('l1', '2026-11-04T12:00:00Z', { visitorHash: 'same' })
    t.click('l1', '2026-10-04T12:00:00Z')
    const query = { organizationId: 'o1', month: '2026-11', tzOffsetMinutes: 0 }
    const clicks = (await t.run(Reports.clicksCsv(query))).trim().split('\r\n')
    expect(clicks).toHaveLength(4)
    expect(clicks[0]).toBe('"time_utc","slug","title","destination","campaign","channel","referrer","country","city","device","browser","os"')
    expect(clicks[3]).toContain('"2026-11-02T12:00:00.000Z","launch","\'=HYPERLINK(""evil"")"')
    expect(clicks[3]).toContain('"qr","","BD","Dhaka"')
    const links = (await t.run(Reports.linksCsv(query))).trim().split('\r\n')
    expect(links[1]).toBe(
      '"launch","\'=HYPERLINK(""evil"")","https://example.com/launch","spring","3","2","1","2026-11-02T12:00:00.000Z","2026-11-04T12:00:00.000Z"',
    )
  })
})

describe('Csv', () => {
  test('quotes cells and defuses spreadsheet formulas', () => {
    expect(Csv.build(['a', 'b'], [['x,"y"', '+1'], [null, 3]])).toBe('"a","b"\r\n"x,""y""","\'+1"\r\n"","3"\r\n')
  })
})
