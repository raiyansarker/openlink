import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useOrganization } from '#/contexts/OrganizationContext'
import {
  getDashboardNavGroups,
  type DashboardNavItem,
} from '#/lib/dashboard/nav-items'
import { dashboardSectionFromPathname } from '#/lib/dashboard/build-org-path'
import { useActivePathname } from '#/hooks/useActivePathname'
import CreateLinkChromeButton from '#/components/dashboard/CreateLinkChromeButton'
import {
  DashboardIcon,
  LinkIcon,
  BarChartIcon,
  ReportIcon,
  GlobeIcon,
  ActivityIcon,
  BellIcon,
  SettingsIcon,
} from '#/components/icons/IcnMcp'
import type { CSSProperties, ReactNode } from 'react'
import type { DashboardSection } from '#/lib/dashboard/build-org-path'
import {
  DASHBOARD_CHROME_TOP_PADDING,
  DASHBOARD_NAV_HORIZONTAL_PADDING,
  DASHBOARD_NAV_HOVER_BG,
  DASHBOARD_NAV_SELECTED_BG,
  DASHBOARD_SURFACE_BG,
  SHELL_NAV_GROUP_LABEL,
  SHELL_NAV_ICON_COLOR,
  SHELL_NAV_TEXT_PRIMARY,
  SHELL_NAV_TEXT_SECONDARY,
} from './dashboard-shell-colors'

const NAV_ITEM_TRANSITION = 'background-color 0.14s ease, color 0.14s ease'

function navItemBackground(selected: boolean, hovered: boolean): string {
  if (hovered) return DASHBOARD_NAV_HOVER_BG
  if (selected) return DASHBOARD_NAV_SELECTED_BG
  return 'transparent'
}

const navLinkBaseStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '4px 8px',
  borderRadius: 7,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12.5,
  textAlign: 'left',
  boxSizing: 'border-box',
  transition: NAV_ITEM_TRANSITION,
}

const NAV_ICONS: Record<DashboardSection, ReactNode> = {
  overview: <DashboardIcon size={16} strokeWidth={1.2} />,
  activity: <ActivityIcon size={16} strokeWidth={1.2} />,
  notifications: <BellIcon size={16} strokeWidth={1.2} />,
  links: <LinkIcon size={16} strokeWidth={1.2} />,
  analytics: <BarChartIcon size={16} strokeWidth={1.2} />,
  domains: <GlobeIcon size={16} strokeWidth={1.2} />,
  reports: <ReportIcon size={16} strokeWidth={1.2} />,
  settings: <SettingsIcon size={16} strokeWidth={1.2} />,
}

function NavLinkItem({
  item,
  isSelected,
}: {
  item: DashboardNavItem
  isSelected: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()

  return (
    <button
      type="button"
      aria-current={isSelected ? 'page' : undefined}
      onClick={() => void navigate({ to: item.href })}
      style={{
        ...navLinkBaseStyle,
        fontWeight: isSelected ? 600 : 400,
        color: isSelected ? SHELL_NAV_TEXT_PRIMARY : SHELL_NAV_TEXT_SECONDARY,
        backgroundColor: navItemBackground(isSelected, hovered),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span
        style={{
          display: 'flex',
          color: isSelected ? SHELL_NAV_TEXT_PRIMARY : SHELL_NAV_ICON_COLOR,
          flexShrink: 0,
        }}
      >
        {NAV_ICONS[item.id]}
      </span>
      {item.label}
    </button>
  )
}

function NavGroupLabel({ label, isFirst }: { label: string; isFirst: boolean }) {
  return (
    <span
      style={{
        display: 'block',
        margin: isFirst ? '0 8px 5px' : '18px 8px 5px',
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: SHELL_NAV_GROUP_LABEL,
      }}
    >
      {label}
    </span>
  )
}

export default function DashboardNavColumn() {
  const { activeOrg } = useOrganization()
  const pathname = useActivePathname()
  const section = dashboardSectionFromPathname(pathname, activeOrg.slug)
  const groups = getDashboardNavGroups(activeOrg.slug)
  return (
    <div
      style={{
        width: 228,
        minWidth: 200,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        backgroundColor: DASHBOARD_SURFACE_BG,
        paddingTop: DASHBOARD_CHROME_TOP_PADDING,
        paddingRight: 10,
        paddingBottom: 24,
        paddingLeft: DASHBOARD_NAV_HORIZONTAL_PADDING,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          padding: `0 ${DASHBOARD_NAV_HORIZONTAL_PADDING}px 14px 0`,
        }}
      >
        <CreateLinkChromeButton layout="fill" hasShortcut />
      </div>

      <nav
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {groups.map((group, groupIndex) => (
          <div key={group.id}>
            <NavGroupLabel label={group.label} isFirst={groupIndex === 0} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map((item) => (
                <NavLinkItem
                  key={item.id}
                  item={item}
                  isSelected={section === item.id}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  )
}
