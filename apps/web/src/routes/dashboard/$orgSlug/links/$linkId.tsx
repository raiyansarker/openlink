import { createFileRoute } from '@tanstack/react-router'
import { Section } from '@astryxdesign/core/Section'
import LinkDetailPage, {
  LINK_DETAIL_TABS,
  type LinkDetailTab,
} from '#/components/link-detail/LinkDetailPage'
import { createPageHead } from '#/lib/page-title'

type LinkDetailSearch = {
  /** Open tab; omitted means Analytics. */
  tab?: LinkDetailTab
}

export const Route = createFileRoute('/dashboard/$orgSlug/links/$linkId')({
  head: createPageHead('Link'),
  validateSearch: (search: Record<string, unknown>): LinkDetailSearch => ({
    tab:
      typeof search.tab === 'string' &&
      (LINK_DETAIL_TABS as readonly string[]).includes(search.tab) &&
      search.tab !== 'analytics'
        ? (search.tab as LinkDetailTab)
        : undefined,
  }),
  component: LinkDetailRoute,
})

function LinkDetailRoute() {
  const { linkId } = Route.useParams()
  const { tab = 'analytics' } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <Section padding={6}>
      <LinkDetailPage
        linkId={linkId}
        tab={tab}
        onTabChange={(next) =>
          void navigate({
            search: { tab: next === 'analytics' ? undefined : next },
            replace: true,
          })
        }
      />
    </Section>
  )
}
