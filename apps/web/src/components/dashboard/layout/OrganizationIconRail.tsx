import { Link } from '@tanstack/react-router'
import { getOrganizationBrand } from '#/data/demo/organization-branding'
import type { Organization } from '#/data/demo/types'
import { replaceOrgInPathname } from '#/lib/dashboard/build-org-path'
import OrganizationBrandIcon from '../icons/OrganizationBrandIcon'

type OrganizationIconRailProps = {
  organizations: Organization[]
  activeOrgId: string
  pathname: string
}

export default function OrganizationIconRail({
  organizations,
  activeOrgId,
  pathname,
}: OrganizationIconRailProps) {
  return (
    <aside className="openlink-dashboard__rail" aria-label="Organizations">
      {organizations.map((org) => {
        const brand = getOrganizationBrand(org.id)
        const isActive = org.id === activeOrgId
        const target = replaceOrgInPathname(pathname, org.id)
        return (
          <Link
            key={org.id}
            to={target}
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
            <OrganizationBrandIcon orgId={org.id} size={22} />
          </Link>
        )
      })}
    </aside>
  )
}
