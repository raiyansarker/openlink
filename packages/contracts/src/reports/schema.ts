import { type } from 'arktype'

import { AnalyticsReport } from '../analytics/schema'
import { OrganizationIdPath } from '../organizations/schema'

/** A calendar month, "YYYY-MM". */
export const ReportMonth = type(/^\d{4}-(0[1-9]|1[0-2])$/)

export const ReportQuery = type({
  month: ReportMonth,
  /** Only links with this UTM campaign. */
  'campaign?': 'string <= 200',
  /** Minutes east of UTC, so the month starts and ends on the viewer's clock. */
  'tzOffset?': type('string.integer.parse').to('-840 <= number.integer <= 840'),
})

export const MonthlyReport = type({
  month: 'string',
  'campaign?': 'string',
  /** Links created in the month (in the campaign, when one is chosen). */
  newLinks: 'number.integer>=0',
  /** With a campaign: how many links carry it. */
  'linkCount?': 'number.integer>=0',
  /** The month's analytics, compared with the month before. */
  report: AnalyticsReport,
})

export const Campaign = type({ name: 'string', links: 'number.integer>=1' })
export const ListCampaignsResponse = type({ items: Campaign.array() })

export { OrganizationIdPath }
