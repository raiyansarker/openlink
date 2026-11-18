import { createFileRoute } from '@tanstack/react-router'
import CreateLinkForm from '#/components/create-link/CreateLinkForm'
import { AuthSession } from '#/lib/auth/client'
import { OrganizationProvider } from '#/contexts/OrganizationContext'
import { createPageHead } from '#/lib/page-title'

type CreateLinkSearch = {
  /** Org slug the link belongs to (defaults to the last active org). */
  org?: string
  /** Folder to create the link in (defaults to the top level). */
  folder?: string
}

export const Route = createFileRoute('/create/link')({
  validateSearch: (search: Record<string, unknown>): CreateLinkSearch => ({
    org: typeof search.org === 'string' && search.org ? search.org : undefined,
    folder:
      typeof search.folder === 'string' && search.folder
        ? search.folder
        : undefined,
  }),
  beforeLoad: ({ location }) => AuthSession.requireSignedIn(location),
  head: createPageHead('Create link'),
  component: CreateLinkPage,
})

function CreateLinkPage() {
  const { org, folder } = Route.useSearch()
  return (
    <OrganizationProvider orgSlugFromRoute={org}>
      <CreateLinkForm initialFolderId={folder ?? null} />
    </OrganizationProvider>
  )
}
