import { type } from 'arktype'

import { oc, openapi } from '../oc'
import {
  AnalyticsQuery,
  AnalyticsReport,
  AnalyticsSummary,
  AnalyticsSummaryQuery,
  OrganizationIdPath,
  RecentClicksQuery,
  RecentClicksResponse,
} from './schema'

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

export const listRecentClicks = analyticsOp(
  'listRecentClicks',
  '/organizations/{organizationId}/analytics/recent',
  'The latest clicks, newest first, for the workspace or one link',
)
  .input(type({ params: OrganizationIdPath, query: RecentClicksQuery }))
  .output(RecentClicksResponse)

export const contract = { getAnalyticsReport, getAnalyticsSummary, listRecentClicks } as const
