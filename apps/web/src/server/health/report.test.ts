import { describe, expect, test } from 'bun:test'
import type { HealthCheckResult } from './checks'
import { healthHttpStatus, resolveHealthReportStatus } from './report'

function check(
  overrides: Partial<HealthCheckResult> & Pick<HealthCheckResult, 'name' | 'status'>,
): HealthCheckResult {
  return { required: true, ...overrides }
}

describe('resolveHealthReportStatus', () => {
  test('returns ok when every check passes', () => {
    expect(
      resolveHealthReportStatus([
        check({ name: 'd1', status: 'ok' }),
        check({ name: 'auth', status: 'ok' }),
      ]),
    ).toBe('ok')
  })

  test('returns error when a required check fails', () => {
    expect(
      resolveHealthReportStatus([
        check({ name: 'd1', status: 'ok' }),
        check({ name: 'auth', status: 'error', required: true }),
      ]),
    ).toBe('error')
  })

  test('returns degraded when only optional checks fail', () => {
    expect(
      resolveHealthReportStatus([
        check({ name: 'd1', status: 'ok', required: true }),
        check({ name: 'feature_flag', status: 'error', required: false }),
      ]),
    ).toBe('degraded')
  })
})

describe('healthHttpStatus', () => {
  test('maps aggregate status to HTTP codes', () => {
    expect(healthHttpStatus('ok')).toBe(200)
    expect(healthHttpStatus('degraded')).toBe(200)
    expect(healthHttpStatus('error')).toBe(503)
  })
})
