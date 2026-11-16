import { type } from 'arktype'

import { oc, openapi } from '../oc'
import { AnalyticsQuery, AnalyticsReport, AnalyticsSummary, AnalyticsSummaryQuery, OrganizationIdPath } from './schema'

const analyticsOp = (operationId: string, path: `/${string}`, summary: string) =>
  oc.meta(openapi({ method: 'GET', operationId, path, summary, inputStructure: 'detailed', tags: ['Analytics'] }))

export const getAnalyticsReport = analyticsOp(
  'getAnalyticsReport',
  '/organizations/{organizationId}/analytics',
  'Clicks for the workspace or one link: totals, time series and breakdowns, with the previous period',
)
  .input(type({ params: OrganizationIdPath, query: AnalyticsQuery }))
  .output(AnalyticsReport)

export const getAnalyticsSummary = analyticsOp(
  'getAnalyticsSummary',
  '/organizations/{organizationId}/analytics/summary',
  'Clicks today and this week, unique visitors and the top referrer',
)
  .input(type({ params: OrganizationIdPath, query: AnalyticsSummaryQuery }))
  .output(AnalyticsSummary)

export const contract = { getAnalyticsReport, getAnalyticsSummary } as const
