import { Link } from '@tanstack/react-router'
import { getOrganizationBrand } from '#/data/demo/organization-branding'
import type { Organization } from '#/data/demo/types'
import { dashboardPaths } from '#/lib/dashboard/route-paths'

type OrganizationIconRailProps = {
  organizations: Organization[]
  activeOrgId: string
  onSelectOrg: (orgId: string) => void
}

export default function OrganizationIconRail({
  organizations,
  activeOrgId,
  onSelectOrg,
}: OrganizationIconRailProps) {
  return (
    <aside className="openlink-dashboard__rail" aria-label="Organizations">
      {organizations.map((org) => {
        const brand = getOrganizationBrand(org.id)
        const isActive = org.id === activeOrgId
        return (
          <Link
            key={org.id}
            to={dashboardPaths.root}
            onClick={() => onSelectOrg(org.id)}
            className="openlink-org-icon"
            data-active={isActive}
            style={{
              background: isActive ? brand.accentMuted : undefined,
              ['--ol-active-ring' as string]: brand.accent,
            }}
            aria-label={org.name}
            aria-current={isActive ? 'true' : undefined}
            title={org.name}
          >
            <span aria-hidden>{brand.glyph}</span>
          </Link>
        )
      })}
    </aside>
  )
}
