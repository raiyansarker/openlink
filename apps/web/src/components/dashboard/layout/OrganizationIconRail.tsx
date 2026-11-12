import { useNavigate } from '@tanstack/react-router'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import type { Organization } from '#/data/demo/types'
import { getOrganizationBrand } from '#/data/demo/organization-branding'
import { replaceOrgInPathname } from '#/lib/dashboard/build-org-path'
import OrganizationLogo from '#/components/dashboard/icons/OrganizationLogo'
import { useActivePathname } from '#/hooks/useActivePathname'

type OrganizationIconRailProps = {
  organizations: Organization[]
  activeOrgSlug: string
}

export default function OrganizationIconRail({
  organizations,
  activeOrgSlug,
}: OrganizationIconRailProps) {
  const pathname = useActivePathname()
  const navigate = useNavigate()

  return (
    <div
      style={{
        width: 64,
        minWidth: 64,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 20,
        gap: 10,
        /* Darkest column */
        backgroundColor: '#0a0a0a',
        flexShrink: 0,
      }}
    >
      {/* App logo mark */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: '#FF4602',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </div>

      {/* Divider */}
      <div style={{ width: 28, height: 1, backgroundColor: '#1f1f1f', marginBottom: 4 }} />

      {/* Org icons */}
      {organizations.map((org) => {
        const brand = getOrganizationBrand(org.id)
        const target = replaceOrgInPathname(pathname, org.slug)
        const isActive = org.slug === activeOrgSlug

        return (
          <Tooltip key={org.id} content={org.name} placement="end">
            <button
              type="button"
              aria-label={`Switch to ${org.name}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => void navigate({ to: target })}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                backgroundColor: isActive ? '#1a1a1a' : 'transparent',
                outline: isActive ? '2px solid #FF4602' : '2px solid transparent',
                outlineOffset: 2,
                transition: 'outline 0.12s ease, background-color 0.12s ease',
              }}
            >
              <OrganizationLogo name={org.name} brand={brand} size={34} />
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
