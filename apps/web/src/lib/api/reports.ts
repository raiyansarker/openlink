import { AnalyticsReportMapper, type AnalyticsReport } from '#/lib/analytics/report'
import type { ReportMonth } from '#/lib/reports/month'
import { ApiClient, type OpenLinkClient } from './client'

export type Campaign = Awaited<ReturnType<OpenLinkClient['reports']['listCampaigns']>>['items'][number]

export type MonthlyReport = {
  month: string
  campaign?: string
  newLinks: number
  /** With a campaign: how many links carry it. */
  linkCount?: number
  report: AnalyticsReport
}

export type ExportKind = 'clicks' | 'links'

/** Monthly and campaign reports, plus their CSV downloads. */
export class ReportsApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async monthly(organizationId: string, month: ReportMonth, campaign: string | null): Promise<MonthlyReport> {
    const dto = await this.client.reports.getMonthlyReport({
      params: { organizationId },
      query: { month: month.key, tzOffset: String(month.tzOffset), ...(campaign ? { campaign } : {}) },
    })
    return { ...dto, report: AnalyticsReportMapper.fromApi(dto.report) }
  }

  async campaigns(organizationId: string): Promise<Campaign[]> {
    const { items } = await this.client.reports.listCampaigns({ params: { organizationId } })
    return items
  }

  /** A plain link to the CSV, so the browser downloads it with the session cookie. */
  static exportUrl(organizationId: string, kind: ExportKind, month: ReportMonth, campaign: string | null): string {
    const query = new URLSearchParams({ kind, month: month.key, tzOffset: String(month.tzOffset) })
    if (campaign) query.set('campaign', campaign)
    return `/api/reports/${encodeURIComponent(organizationId)}/export?${query}`
  }
}
