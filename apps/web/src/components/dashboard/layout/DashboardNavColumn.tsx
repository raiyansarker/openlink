import { useNavigate } from '@tanstack/react-router'
import { useOrganization } from '#/contexts/OrganizationContext'
import {
  getDashboardNavGroups,
  getDashboardSettingsItem,
  type DashboardNavItem,
} from '#/lib/dashboard/nav-items'
import { dashboardSectionFromPathname } from '#/lib/dashboard/build-org-path'
import { useActivePathname } from '#/hooks/useActivePathname'
import {
  DashboardIcon,
  LinkIcon,
  BarChartIcon,
  UsersIcon,
  SettingsIcon,
  ReportIcon,
  GlobeIcon,
  ActivityIcon,
  BellIcon,
} from '#/components/icons/IcnMcp'
import type { ReactNode } from 'react'
import { DASHBOARD_SHELL_ACCENT } from './dashboard-shell-accent'
import type { DashboardSection } from '#/lib/dashboard/build-org-path'
import { DASHBOARD_PANEL_BACKGROUND } from './dashboard-shell-colors'

const NAV_RADIUS = 9
const NAV_TRANSITION = 'color 0.16s ease, background-color 0.16s ease, border-radius 0.16s ease'

function ShortcutChip({ children }: { children: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.42)',
        fontWeight: 500,
        letterSpacing: '0.04em',
        backgroundColor: 'rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 5,
        padding: '2px 5px',
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  )
}

const NAV_ICONS: Record<DashboardSection, ReactNode> = {
  overview: <DashboardIcon size={15} />,
  activity: <ActivityIcon size={15} />,
  notifications: <BellIcon size={15} />,
  links: <LinkIcon size={15} />,
  analytics: <BarChartIcon size={15} />,
  members: <UsersIcon size={15} />,
  domains: <GlobeIcon size={15} />,
  reports: <ReportIcon size={15} />,
  settings: <SettingsIcon size={15} />,
}

function NavLinkItem({
  item,
  isSelected,
}: {
  item: DashboardNavItem
  isSelected: boolean
}) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      aria-current={isSelected ? 'page' : undefined}
      onClick={() => void navigate({ to: item.href })}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '6px 10px 6px 8px',
        border: 'none',
        borderRadius: NAV_RADIUS,
        cursor: 'pointer',
        backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
        color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.55)',
        fontFamily: 'inherit',
        fontSize: 13,
        fontWeight: isSelected ? 500 : 400,
        textAlign: 'left',
        transition: NAV_TRANSITION,
        marginBottom: 2,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          const el = e.currentTarget
          el.style.color = 'rgba(255,255,255,0.92)'
          el.style.backgroundColor = 'rgba(255,255,255,0.07)'
          el.style.borderRadius = `${NAV_RADIUS}px`
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          const el = e.currentTarget
          el.style.color = 'rgba(255,255,255,0.55)'
          el.style.backgroundColor = 'transparent'
        }
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 2,
          height: isSelected ? 14 : 0,
          borderRadius: '0 2px 2px 0',
          backgroundColor: DASHBOARD_SHELL_ACCENT,
          transition: 'height 0.16s ease',
        }}
      />
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'inherit',
          flexShrink: 0,
        }}
      >
        {NAV_ICONS[item.id]}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
    </button>
  )
}

function NavGroupLabel({ label, isFirst }: { label: string; isFirst: boolean }) {
  return (
    <p
      style={{
        margin: isFirst ? '4px 4px 4px' : '22px 4px 6px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.32)',
      }}
    >
      {label}
    </p>
  )
}

export default function DashboardNavColumn() {
  const { activeOrg } = useOrganization()
  const pathname = useActivePathname()
  const section = dashboardSectionFromPathname(pathname, activeOrg.slug)
  const groups = getDashboardNavGroups(activeOrg.slug)
  const settingsItem = getDashboardSettingsItem(activeOrg.slug)

  return (
    <div
      style={{
        width: 232,
        minWidth: 200,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: DASHBOARD_PANEL_BACKGROUND,
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '14px 12px 10px 16px' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            width: '100%',
            padding: '7px 12px',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10,
            cursor: 'pointer',
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: '#f4f4f5',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '0.01em',
            transition: 'background-color 0.16s ease, border-color 0.16s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.09)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
          }}
        >
          <span>Create link</span>
          <ShortcutChip>C</ShortcutChip>
        </button>
      </div>

      <div style={{ flex: 1, padding: '0 8px 0 16px', overflowY: 'auto' }}>
        {groups.map((group, groupIndex) => (
          <div key={group.id}>
            <NavGroupLabel label={group.label} isFirst={groupIndex === 0} />
            {group.items.map((item) => (
              <NavLinkItem
                key={item.id}
                item={item}
                isSelected={section === item.id}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '6px 8px 14px 16px' }}>
        <NavLinkItem
          item={settingsItem}
          isSelected={section === 'settings'}
        />
      </div>
    </div>
  )
}
