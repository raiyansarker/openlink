import { Effect } from 'effect'

import { AnalyticsReports, AnalyticsSummaries, RecentClicks } from '#/server/analytics/report'
import { requireOrgMemberEffect } from '#/server/effect/access'
import { getLinkInOrganization } from '#/server/links/service'

import { os } from './os'
import { notFound } from '../errors'

export const analyticsRouter = {
  getAnalyticsReport: os.analytics.getAnalyticsReport.effect(function* ({ input }) {
    const organizationId = input.params.organizationId
    yield* requireOrgMemberEffect(organizationId)
    const { linkId, range = '30d', tzOffset = 0 } = input.query
    // A link outside this workspace must not reveal whether it exists.
    if (linkId && !(yield* getLinkInOrganization(organizationId, linkId))) return yield* Effect.fail(notFound('Link not found'))
    return yield* AnalyticsReports.build({ organizationId, ...(linkId ? { linkId } : {}) }, range, tzOffset)
  }),

  listRecentClicks: os.analytics.listRecentClicks.effect(function* ({ input }) {
    const organizationId = input.params.organizationId
    yield* requireOrgMemberEffect(organizationId)
    const { linkId, limit } = input.query
    if (linkId && !(yield* getLinkInOrganization(organizationId, linkId))) return yield* Effect.fail(notFound('Link not found'))
    return yield* RecentClicks.list({ organizationId, ...(linkId ? { linkId } : {}) }, limit)
  }),

  getAnalyticsSummary: os.analytics.getAnalyticsSummary.effect(function* ({ input }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    return yield* AnalyticsSummaries.build(input.params.organizationId, input.query.tzOffset ?? 0)
  }),
}
