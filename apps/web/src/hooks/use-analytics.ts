import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { AnalyticsRange } from '#/lib/analytics/report'
import { AnalyticsApi } from '#/lib/api/analytics'
import { QueryKeys } from '#/lib/api/query'

const api = new AnalyticsApi()

/** One analytics report. Switching range or link keeps the last report on screen until the next arrives. */
export function useAnalyticsReport(organizationId: string, range: AnalyticsRange, linkId: string | null) {
  return useQuery({
    queryKey: QueryKeys.analytics(organizationId, range, linkId),
    queryFn: () => api.report(organizationId, { range, linkId }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

/** Overview numbers: clicks today and this week, unique visitors, top referrer. */
export function useAnalyticsSummary(organizationId: string) {
  return useQuery({
    queryKey: QueryKeys.analyticsSummary(organizationId),
    queryFn: () => api.summary(organizationId),
    staleTime: 60_000,
  })
}

/** The latest clicks, refreshed every 15 seconds while the page is open. */
export function useRecentClicks(organizationId: string, linkId: string | null) {
  return useQuery({
    queryKey: QueryKeys.recentClicks(organizationId, linkId),
    queryFn: () => api.recent(organizationId, linkId),
    refetchInterval: 15_000,
    placeholderData: keepPreviousData,
  })
}
