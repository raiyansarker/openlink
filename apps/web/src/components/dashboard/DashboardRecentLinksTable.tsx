import { useNavigate } from '@tanstack/react-router'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import LinksListView from '#/components/links/LinksListView'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { ShortLink } from '#/data/demo/types'

export default function DashboardRecentLinksTable() {
  const { links, activeOrg } = useOrganization()
  const navigate = useNavigate()
  const rows = [...links]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 6)

  const openLink = (link: ShortLink) =>
    void navigate({
      to: '/dashboard/$orgSlug/links/$linkId',
      params: { orgSlug: activeOrg.slug, linkId: link.id },
    })

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No links yet"
        description="Create your first short link to start tracking clicks here."
        icon={<EmptyLinksIllustration />}
      />
    )
  }

  return (
    <LinksListView
      links={rows}
      org={activeOrg}
      onOpenLink={openLink}
      linkMenu={(link) => [
        { id: 'open', label: 'Open details', onClick: () => openLink(link) },
        {
          id: 'edit',
          label: 'Edit',
          onClick: () =>
            void navigate({
              to: '/edit/link',
              search: { org: activeOrg.slug, link: link.id },
            }),
        },
      ]}
    />
  )
}
