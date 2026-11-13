import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import CreateLinkForm from '#/components/create-link/CreateLinkForm'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardOrgPath } from '#/lib/dashboard/build-org-path'

/** Finds the link to edit, then hands it to the shared create/edit form. */
export default function EditLinkScreen({ linkId }: { linkId: string | undefined }) {
  const navigate = useNavigate()
  const { activeOrg, links } = useOrganization()
  const link = linkId ? links.find((l) => l.id === linkId) : undefined

  if (!link) {
    return (
      <div style={{ padding: '96px 24px' }}>
        <EmptyState
          title="Link not found"
          description="It may have been deleted, or it belonged to an earlier session."
          icon={<EmptyLinksIllustration />}
          actions={
            <Button
              variant="secondary"
              label="Back to links"
              onClick={() =>
                void navigate({ to: buildDashboardOrgPath(activeOrg.slug, 'links') })
              }
            />
          }
        />
      </div>
    )
  }

  // Keyed so switching links resets the form state.
  return <CreateLinkForm key={link.id} initialFolderId={link.folderId ?? null} editLink={link} />
}
