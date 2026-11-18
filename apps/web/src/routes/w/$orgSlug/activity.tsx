import { createFileRoute } from '@tanstack/react-router'
import DashboardActivityPanel, {
  ACTIVITY_CATEGORIES,
  type ActivityFilterState,
} from '#/components/activity/DashboardActivityPanel'
import type { ActivityCategory } from '#/lib/api/types'
import { createPageHead } from '#/lib/page-title'

type ActivitySearch = { category?: ActivityCategory; q?: string }

export const Route = createFileRoute('/w/$orgSlug/activity')({
  head: createPageHead('Activity'),
  // Every key is set so raw values from parent routes can't leak through.
  validateSearch: (search: Record<string, unknown>): ActivitySearch => ({
    category:
      typeof search.category === 'string' && (ACTIVITY_CATEGORIES as string[]).includes(search.category)
        ? (search.category as ActivityCategory)
        : undefined,
    q: typeof search.q === 'string' && search.q.trim() ? search.q.slice(0, 100) : undefined,
  }),
  component: DashboardActivityPage,
})

function DashboardActivityPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const filters: ActivityFilterState = { category: search.category ?? 'all', q: search.q ?? '' }
  return (
    <DashboardActivityPanel
      filters={filters}
      onFiltersChange={(change) => {
        const next = { ...filters, ...change }
        void navigate({
          search: {
            category: next.category === 'all' ? undefined : next.category,
            q: next.q.trim() ? next.q : undefined,
          },
          replace: true,
          resetScroll: false,
        })
      }}
    />
  )
}
