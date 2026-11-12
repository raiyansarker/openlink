import type { HealthCheckResult, HealthReport } from './checks'

export function resolveHealthReportStatus(
  checks: HealthCheckResult[],
): HealthReport['status'] {
  const requiredFailed = checks.some((c) => c.required && c.status === 'error')
  const anyFailed = checks.some((c) => c.status === 'error')

  if (requiredFailed) return 'error'
  if (anyFailed) return 'degraded'
  return 'ok'
}

export function healthHttpStatus(status: HealthReport['status']): number {
  return status === 'error' ? 503 : 200
}
