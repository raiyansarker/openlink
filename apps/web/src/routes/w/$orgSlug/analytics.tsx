import { createFileRoute } from '@tanstack/react-router'
import DashboardAnalyticsPanel from '#/components/analytics/DashboardAnalyticsPanel'
import { AnalyticsSearchParams, type AnalyticsSearch, type AnalyticsView } from '#/lib/analytics/search'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/w/$orgSlug/analytics')({
  validateSearch: (search: Record<string, unknown>): AnalyticsSearch =>
    AnalyticsSearchParams.parse(search, { withLink: true }),
  head: createPageHead('Analytics'),
  component: DashboardAnalyticsPage,
})

function DashboardAnalyticsPage() {
  const view = AnalyticsSearchParams.toView(Route.useSearch())
  const navigate = Route.useNavigate()
  const changeView = (change: Partial<AnalyticsView>, options?: { push?: boolean }) =>
    void navigate({
      search: AnalyticsSearchParams.toSearch({ ...view, ...change }),
      // Settings replace the entry; drilling into a link adds one, so Back returns to all links.
      replace: !options?.push,
      resetScroll: false,
    })
  return <DashboardAnalyticsPanel view={view} onViewChange={changeView} />
}
