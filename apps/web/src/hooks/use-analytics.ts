import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { toAnalyticsReport, type AnalyticsRange } from '#/lib/analytics/report'
import { orpc } from '#/lib/api/orpc'

/** Minutes east of UTC, e.g. 360 in Dhaka. Reports are read in the viewer's time zone. */
const tzOffset = () => String(-new Date().getTimezoneOffset())

/** One analytics report. Switching range or link keeps the last report on screen until the next arrives. */
export function useAnalyticsReport(organizationId: string, range: AnalyticsRange, linkId: string | null) {
  return useQuery(
    orpc.analytics.getAnalyticsReport.queryOptions({
      input: {
        params: { organizationId },
        query: { range, tzOffset: tzOffset(), ...(linkId ? { linkId } : {}) },
      },
      select: toAnalyticsReport,
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    }),
  )
}

/** Overview numbers: clicks today and this week, unique visitors, top referrer. */
export function useAnalyticsSummary(organizationId: string) {
  return useQuery(
    orpc.analytics.getAnalyticsSummary.queryOptions({
      input: { params: { organizationId }, query: { tzOffset: tzOffset() } },
      staleTime: 60_000,
    }),
  )
}

const selectItems = <T,>(data: { items: T[] }): T[] => data.items

/** The latest clicks, refreshed every 15 seconds while the page is open. */
export function useRecentClicks(organizationId: string, linkId: string | null, limit = 12) {
  return useQuery(
    orpc.analytics.listRecentClicks.queryOptions({
      input: { params: { organizationId }, query: { limit: String(limit), ...(linkId ? { linkId } : {}) } },
      select: selectItems,
      refetchInterval: 15_000,
      placeholderData: keepPreviousData,
    }),
  )
}
