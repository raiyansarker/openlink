import { describe, expect, test } from 'bun:test'
import { RateLimiter } from './rate-limit/limiter'
import { CRONS, runScheduled } from './scheduled'
import { createTestDatabase } from './testing/sqlite'

const { db, sqlite } = createTestDatabase()

describe('runScheduled', () => {
  test('the hourly cron deletes ended rate-limit windows and keeps live ones', async () => {
    const start = Date.UTC(2026, 0, 1, 12, 0, 0)
    const limiter = new RateLimiter(() => db, () => start)
    await limiter.consume([{ key: 'minute', rules: [{ window: 60, max: 1 }] }, { key: 'day', rules: [{ window: 86_400, max: 1 }] }])
    await runScheduled({ cron: CRONS.pruneRateLimits, scheduledTime: start + 60 * 60 * 1000 }, () => db)
    expect((sqlite.query('select count(*) as count from rate_limit').get() as { count: number }).count).toBe(1)
  })

  test('an unknown cron does nothing', async () => {
    await runScheduled({ cron: '*/5 * * * *', scheduledTime: Date.now() + 10 * 86_400_000 }, () => db)
    expect((sqlite.query('select count(*) as count from rate_limit').get() as { count: number }).count).toBe(1)
  })
})
