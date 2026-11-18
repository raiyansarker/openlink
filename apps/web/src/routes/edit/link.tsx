import { createFileRoute } from '@tanstack/react-router'
import EditLinkScreen from '#/components/create-link/EditLinkScreen'
import { AuthSession } from '#/lib/auth/client'
import { OrganizationProvider } from '#/contexts/OrganizationContext'
import { createPageHead } from '#/lib/page-title'

type EditLinkSearch = {
  /** Org slug the link belongs to (defaults to the last active org). */
  org?: string
  /** Link id to edit. */
  link?: string
}

export const Route = createFileRoute('/edit/link')({
  validateSearch: (search: Record<string, unknown>): EditLinkSearch => ({
    org: typeof search.org === 'string' && search.org ? search.org : undefined,
    link: typeof search.link === 'string' && search.link ? search.link : undefined,
  }),
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  head: createPageHead('Edit link'),
  component: EditLinkPage,
})

function EditLinkPage() {
  const { org, link } = Route.useSearch()
  return (
    <OrganizationProvider orgSlugFromRoute={org}>
      <EditLinkScreen linkId={link} />
    </OrganizationProvider>
  )
}
