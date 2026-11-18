import { createFileRoute } from '@tanstack/react-router'
import { Section } from '@astryxdesign/core/Section'
import LinkDetailPage from '#/components/link-detail/LinkDetailPage'
import { LINK_DETAIL_TABS, type LinkDetailTab } from '#/lib/links/link-detail-tabs'
import { AnalyticsSearchParams, type AnalyticsSearch, type AnalyticsView } from '#/lib/analytics/search'
import type { HistoryKind } from '#/components/link-detail/LinkHistoryTimeline'
import { createPageHead } from '#/lib/page-title'

type LinkDetailSearch = Omit<AnalyticsSearch, 'link'> & {
  /** Open tab; omitted means Analytics. */
  tab?: LinkDetailTab
  /** History tab filter; omitted means All. */
  kind?: HistoryKind
}

export const Route = createFileRoute('/w/$orgSlug/links/$linkId')({
  validateSearch: (search: Record<string, unknown>): LinkDetailSearch => ({
    tab:
      typeof search.tab === 'string' &&
      (LINK_DETAIL_TABS as readonly string[]).includes(search.tab) &&
      search.tab !== 'analytics'
        ? (search.tab as LinkDetailTab)
        : undefined,
    kind: search.kind === 'edits' || search.kind === 'hold' ? search.kind : undefined,
    // The Analytics tab's period, comparison and chart view.
    ...AnalyticsSearchParams.parse(search, { withLink: false }),
  }),
  head: createPageHead('Link'),
  component: LinkDetailRoute,
})

function LinkDetailRoute() {
  const { linkId } = Route.useParams()
  const search = Route.useSearch()
  const { tab = 'analytics' } = search
  const navigate = Route.useNavigate()
  const analyticsView = AnalyticsSearchParams.toView(search)
  const changeAnalyticsView = (change: Partial<AnalyticsView>) =>
    void navigate({
      search: (prev) => ({ ...prev, ...AnalyticsSearchParams.toSearch({ ...analyticsView, ...change, linkId: null }) }),
      replace: true,
      resetScroll: false,
    })
  return (
    <Section padding={6}>
      <LinkDetailPage
        linkId={linkId}
        tab={tab}
        // Switching tabs keeps the analytics settings, so coming back shows the same period.
        onTabChange={(next) =>
          void navigate({
            search: (prev) => ({ ...prev, tab: next === 'analytics' ? undefined : next }),
            replace: true,
          })
        }
        analyticsView={analyticsView}
        onAnalyticsViewChange={changeAnalyticsView}
        historyKind={search.kind ?? null}
        onHistoryKindChange={(kind) =>
          void navigate({ search: (prev) => ({ ...prev, kind: kind ?? undefined }), replace: true, resetScroll: false })
        }
      />
    </Section>
  )
}
