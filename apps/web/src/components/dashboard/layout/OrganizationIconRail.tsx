import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import type { Workspace } from '#/lib/api/types'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import OrganizationLogo from '#/components/dashboard/icons/OrganizationLogo'
import OpenLinkAppMark from '#/components/dashboard/icons/OpenLinkAppMark'
import { useActivePathname } from '#/hooks/useActivePathname'
import DashboardAccountMenu from './DashboardAccountMenu'
import { PlusIcon, SettingsIcon } from '#/components/icons/IcnMcp'
import { isDashboardSettingsPath } from '#/lib/dashboard/paths/settings'
import type { CSSProperties, ReactNode } from 'react'
import {
  DASHBOARD_RAIL_BG,
  DASHBOARD_RAIL_HOVER_BG,
  DASHBOARD_RAIL_SELECTED_BG,
  DASHBOARD_CONTENT_PANEL_BORDER,
  DASHBOARD_CONTENT_PANEL_RADIUS,
  DASHBOARD_CONTENT_PANEL_SHADOW,
  DASHBOARD_SURFACE_BG,
} from './dashboard-shell-colors'

/** Gap around the rail, matching the content panel's inset. */
const RAIL_INSET = 10
const RAIL_COLUMN_WIDTH = 52
const ORG_CONTROL_SIZE = 34
const ORG_LOGO_SIZE = 28
const ORG_CONTROL_RADIUS = 9
/** Low-edge of the active-org indicator: the rail's very left, in the button's gutter. */
const ORG_INDICATOR_OFFSET = -(RAIL_COLUMN_WIDTH - ORG_CONTROL_SIZE) / 2
/** Concentric corners: the logo's radius is the control's minus the gap between them. */
const ORG_LOGO_RADIUS = ORG_CONTROL_RADIUS - (ORG_CONTROL_SIZE - ORG_LOGO_SIZE) / 2

type OrganizationIconRailProps = {
  organizations: Workspace[]
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
  borderRadius: ORG_CONTROL_RADIUS,
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

  return (
    <Tooltip content={orgName} placement="end">
      <button
        className="ol-focus-ring"
        type="button"
        aria-label={`Switch to ${orgName}`}
        aria-current={isActive ? 'true' : undefined}
        onClick={onClick}
        style={{
          ...orgControlBase,
          position: 'relative',
          backgroundColor,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        {children}
        {/* The active workspace: a brand-orange bar at the rail's very left edge. */}
        {isActive ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: ORG_INDICATOR_OFFSET,
              top: '50%',
              width: 3,
              height: 18,
              marginTop: -9,
              borderRadius: 3,
              backgroundColor: 'var(--openlink-brand)',
            }}
          />
        ) : null}
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
        className="ol-focus-ring"
        type="button"
        aria-label="Settings"
        aria-current={isActive ? 'page' : undefined}
        onClick={() => void navigate({ to: '/settings/profile' })}
        style={{
          ...orgControlBase,
          backgroundColor,
          boxShadow,
          color:
            isActive || hovered
              ? 'rgba(255, 255, 255, 0.95)'
              : 'rgba(255, 255, 255, 0.72)',
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
  function handleCreateOrganization() {
    void navigate({ to: '/create/organization' })
  }

  return (
    <div
      style={{
        height: '100%',
        padding: RAIL_INSET,
        paddingRight: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexShrink: 0,
        backgroundColor: DASHBOARD_SURFACE_BG,
      }}
    >
      <div
        style={{
          width: RAIL_COLUMN_WIDTH,
          minWidth: RAIL_COLUMN_WIDTH,
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // Same inset above the first org as on its sides, so it doesn't touch the rounded top.
          paddingTop: (52 - ORG_CONTROL_SIZE) / 2,
          paddingBottom: 10,
          backgroundColor: DASHBOARD_RAIL_BG,
          borderRadius: DASHBOARD_CONTENT_PANEL_RADIUS,
          border: DASHBOARD_CONTENT_PANEL_BORDER,
          boxShadow: DASHBOARD_CONTENT_PANEL_SHADOW,
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Tooltip content="OpenLink" placement="end">
          <button
            className="ol-focus-ring"
            type="button"
            aria-label="OpenLink home"
            onClick={() => void navigate({ to: '/w' })}
            style={{ ...orgControlBase, marginBottom: 8, background: 'transparent' }}
          >
            <OpenLinkAppMark size={ORG_LOGO_SIZE} variant="light" />
          </button>
        </Tooltip>
        <div
          aria-hidden
          style={{
            width: 20,
            height: 1,
            flexShrink: 0,
            marginBottom: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.14)',
          }}
        />

        <div
          className="focus-inset"
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
            const target = WorkspaceUrl.replaceOrg(pathname, org.slug)
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
                  size={ORG_LOGO_SIZE}
                  radius={ORG_LOGO_RADIUS}
                  customImageUrl={org.logoUrl}
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
                className="ol-focus-ring"
                type="button"
                aria-label="Create organization"
                onClick={handleCreateOrganization}
                style={{
                  ...orgControlBase,
                  border: '1px dashed rgba(255, 255, 255, 0.22)',
                  backgroundColor: createHovered
                    ? DASHBOARD_RAIL_HOVER_BG
                    : 'transparent',
                  color: createHovered
                    ? 'rgba(255, 255, 255, 0.95)'
                    : 'rgba(255, 255, 255, 0.72)',
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
    </div>
  )
}
