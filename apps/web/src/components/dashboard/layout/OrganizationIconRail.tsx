import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import type { Organization } from '#/data/demo/types'
import { getOrganizationBrand } from '#/data/demo/organization-branding'
import {
  replaceOrgInPathname,
} from '#/lib/dashboard/build-org-path'
import OrganizationLogo from '#/components/dashboard/icons/OrganizationLogo'
import { useWorkspaceDirectory } from '#/contexts/WorkspaceDirectoryContext'
import { useActivePathname } from '#/hooks/useActivePathname'
import DashboardAccountMenu from './DashboardAccountMenu'
import { PlusIcon, SettingsIcon } from '#/components/icons/IcnMcp'
import { buildSettingsPath } from '#/lib/settings/sections'
import { isDashboardSettingsPath } from '#/lib/dashboard/paths/settings'
import type { CSSProperties, ReactNode } from 'react'
import {
  DASHBOARD_CHROME_TOP_PADDING,
  DASHBOARD_RAIL_BG,
  DASHBOARD_RAIL_HOVER_BG,
  DASHBOARD_RAIL_SELECTED_BG,
} from './dashboard-shell-colors'

const ORG_CONTROL_SIZE = 34
const ORG_LOGO_SIZE = 28

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
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.14s ease, box-shadow 0.14s ease',
}

function OrgSwitchButton({
  orgName,
  isActive,
  onClick,
  children,
}: {
  orgName: string
  isActive: boolean
  onClick: () => void
  children: ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  const backgroundColor = isActive
    ? DASHBOARD_RAIL_SELECTED_BG
    : hovered
      ? DASHBOARD_RAIL_HOVER_BG
      : 'transparent'

  const boxShadow = isActive
    ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.28)'
    : 'none'

  return (
    <Tooltip content={orgName} placement="end">
      <button
        type="button"
        aria-label={`Switch to ${orgName}`}
        aria-current={isActive ? 'true' : undefined}
        onClick={onClick}
        style={{
          ...orgControlBase,
          backgroundColor,
          boxShadow,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function RailSettingsButton() {
  const [hovered, setHovered] = useState(false)
  const pathname = useActivePathname()
  const navigate = useNavigate()
  const isActive = isDashboardSettingsPath(pathname)

  const backgroundColor = isActive
    ? DASHBOARD_RAIL_SELECTED_BG
    : hovered
      ? DASHBOARD_RAIL_HOVER_BG
      : 'transparent'

  const boxShadow = isActive
    ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.28)'
    : 'none'

  return (
    <Tooltip content="Settings" placement="end">
      <button
        type="button"
        aria-label="Settings"
        aria-current={isActive ? 'page' : undefined}
        onClick={() => void navigate({ to: buildSettingsPath('profile') })}
        style={{
          ...orgControlBase,
          backgroundColor,
          boxShadow,
          color: isActive || hovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.72)',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        <SettingsIcon size={17} strokeWidth={1.15} />
      </button>
    </Tooltip>
  )
}

export default function OrganizationIconRail({
  organizations,
  activeOrgSlug,
}: OrganizationIconRailProps) {
  const [createHovered, setCreateHovered] = useState(false)
  const pathname = useActivePathname()
  const navigate = useNavigate()
  const { orgCustomIcons } = useWorkspaceDirectory()
  function handleCreateOrganization() {
    void navigate({ to: '/create/organization' })
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
        paddingTop: DASHBOARD_CHROME_TOP_PADDING,
        paddingBottom: 12,
        backgroundColor: DASHBOARD_RAIL_BG,
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
            <OrgSwitchButton
              key={org.id}
              orgName={org.name}
              isActive={isActive}
              onClick={() => void navigate({ to: target })}
            >
              <OrganizationLogo
                name={org.name}
                brand={brand}
                size={ORG_LOGO_SIZE}
                customImageUrl={orgCustomIcons[org.id]}
              />
            </OrgSwitchButton>
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
            backgroundColor: DASHBOARD_RAIL_BG,
            boxShadow: `0 -10px 12px ${DASHBOARD_RAIL_BG}`,
          }}
        >
          <Tooltip content="Create organization" placement="end">
            <button
              type="button"
              aria-label="Create organization"
              onClick={handleCreateOrganization}
              style={{
                ...orgControlBase,
                border: '1px dashed rgba(255, 255, 255, 0.22)',
                backgroundColor: createHovered
                  ? DASHBOARD_RAIL_HOVER_BG
                  : 'transparent',
                color: createHovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.72)',
              }}
              onMouseEnter={() => setCreateHovered(true)}
              onMouseLeave={() => setCreateHovered(false)}
              onFocus={() => setCreateHovered(true)}
              onBlur={() => setCreateHovered(false)}
            >
              <PlusIcon size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          marginTop: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <RailSettingsButton />
        <DashboardAccountMenu variant="rail" />
      </div>
    </div>
  )
}
