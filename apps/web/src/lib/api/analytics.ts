import type { AnalyticsRange } from '@openlink/contracts'

import { AnalyticsReportMapper, type AnalyticsReport } from '#/lib/analytics/report'
import { ApiClient, type OpenLinkClient } from './client'

export type AnalyticsSummary = Awaited<ReturnType<OpenLinkClient['analytics']['getAnalyticsSummary']>>

/** Click analytics, read in the viewer's time zone. */
export class AnalyticsApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  /** Minutes east of UTC, e.g. 360 in Dhaka. */
  static tzOffset(now = new Date()): number {
    return -now.getTimezoneOffset()
  }

  async report(organizationId: string, options: { range: AnalyticsRange; linkId?: string | null }): Promise<AnalyticsReport> {
    const dto = await this.client.analytics.getAnalyticsReport({
      params: { organizationId },
      query: {
        range: options.range,
        tzOffset: String(AnalyticsApi.tzOffset()),
        ...(options.linkId ? { linkId: options.linkId } : {}),
      },
    })
    return AnalyticsReportMapper.fromApi(dto)
  }

  summary(organizationId: string): Promise<AnalyticsSummary> {
    return this.client.analytics.getAnalyticsSummary({
      params: { organizationId },
      query: { tzOffset: String(AnalyticsApi.tzOffset()) },
    })
  }
}
