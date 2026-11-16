import { type } from 'arktype'

import { oc, openapi } from '../oc'
import { ListCampaignsResponse, MonthlyReport, OrganizationIdPath, ReportQuery } from './schema'

const reportsOp = (operationId: string, path: `/${string}`, summary: string) =>
  oc.meta(openapi({ method: 'GET', operationId, path, summary, inputStructure: 'detailed', tags: ['Reports'] }))

export const getMonthlyReport = reportsOp(
  'getMonthlyReport',
  '/organizations/{organizationId}/reports/monthly',
  'A calendar month of clicks, compared with the month before; optionally one UTM campaign',
)
  .input(type({ params: OrganizationIdPath, query: ReportQuery }))
  .output(MonthlyReport)

export const listCampaigns = reportsOp(
  'listCampaigns',
  '/organizations/{organizationId}/reports/campaigns',
  'UTM campaigns used on the workspace’s links',
)
  .input(type({ params: OrganizationIdPath }))
  .output(ListCampaignsResponse)

export const contract = { getMonthlyReport, listCampaigns } as const
