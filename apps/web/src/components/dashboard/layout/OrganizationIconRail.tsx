import { useNavigate } from '@tanstack/react-router'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import type { Organization } from '#/data/demo/types'
import { getOrganizationBrand } from '#/data/demo/organization-branding'
import {
  buildDashboardOrgPath,
  replaceOrgInPathname,
} from '#/lib/dashboard/build-org-path'
import OrganizationLogo from '#/components/dashboard/icons/OrganizationLogo'
import { useActivePathname } from '#/hooks/useActivePathname'
import DashboardAccountMenu from './DashboardAccountMenu'
import { useOrganization } from '#/contexts/OrganizationContext'
import { PlusIcon } from '#/components/icons/IcnMcp'
import type { CSSProperties } from 'react'

const ORG_CONTROL_SIZE = 34
const ORG_LOGO_SIZE = 28
const RAIL_BACKGROUND = '#0a0a0a'

type OrganizationIconRailProps = {
  organizations: Organization[]
  activeOrgSlug: string
}

const orgControlBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: ORG_CONTROL_SIZE,
  height: ORG_CONTROL_SIZE,
  minWidth: ORG_CONTROL_SIZE,
  minHeight: ORG_CONTROL_SIZE,
  flexShrink: 0,
  borderRadius: 9,
  padding: 0,
}

export default function OrganizationIconRail({
  organizations,
  activeOrgSlug,
}: OrganizationIconRailProps) {
  const pathname = useActivePathname()
  const navigate = useNavigate()
  const { createOrganization } = useOrganization()

  function handleCreateOrganization() {
    const name = window.prompt('Workspace name')?.trim()
    if (!name) return
    try {
      const org = createOrganization({ name })
      void navigate({ to: buildDashboardOrgPath(org.slug) })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not create workspace.'
      window.alert(message)
    }
  }

  return (
    <div
      style={{
        width: 52,
        minWidth: 52,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 14,
        paddingBottom: 12,
        backgroundColor: RAIL_BACKGROUND,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {organizations.map((org) => {
          const brand = getOrganizationBrand(org.id)
          const target = replaceOrgInPathname(pathname, org.slug)
          const isActive = org.slug === activeOrgSlug

          return (
            <Tooltip key={org.id} content={org.name} placement="end">
              <button
                type="button"
                aria-label={`Switch to ${org.name}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => void navigate({ to: target })}
                style={{
                  ...orgControlBase,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.08)'
                    : 'transparent',
                  boxShadow: isActive
                    ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.28)'
                    : 'none',
                  transition: 'background-color 0.16s ease, box-shadow 0.16s ease',
                }}
              >
                <OrganizationLogo
                  name={org.name}
                  brand={brand}
                  size={ORG_LOGO_SIZE}
                />
              </button>
            </Tooltip>
          )
        })}

        <div
          style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            paddingTop: 6,
            paddingBottom: 2,
            marginTop: 2,
            backgroundColor: RAIL_BACKGROUND,
            boxShadow: `0 -10px 12px ${RAIL_BACKGROUND}`,
          }}
        >
          <Tooltip content="Create organization" placement="end">
            <button
              type="button"
              aria-label="Create organization"
              onClick={handleCreateOrganization}
              style={{
                ...orgControlBase,
                border: '1px dashed rgba(255,255,255,0.22)',
                cursor: 'pointer',
                backgroundColor: RAIL_BACKGROUND,
                color: 'rgba(255,255,255,0.55)',
                transition:
                  'background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = RAIL_BACKGROUND
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)'
              }}
            >
              <PlusIcon size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div style={{ flexShrink: 0, marginTop: 10 }}>
        <DashboardAccountMenu />
      </div>
    </div>
  )
}
