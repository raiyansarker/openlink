import { useNavigate } from '@tanstack/react-router'
import { useOrganization } from '#/contexts/OrganizationContext'
import { getDashboardNavItems } from '#/lib/dashboard/nav-items'
import { dashboardSectionFromPathname } from '#/lib/dashboard/build-org-path'
import { useActivePathname } from '#/hooks/useActivePathname'
import { getOrganizationBrand } from '#/data/demo/organization-branding'
import {
  HomeIcon,
  LinkIcon,
  BarChartIcon,
  UsersIcon,
  SettingsIcon,
  PlusIcon,
} from '#/components/icons/IcnMcp'
import type { DashboardNavItem } from '#/lib/dashboard/nav-items'
import type { ReactNode } from 'react'

const NAV_ICONS: Record<string, ReactNode> = {
  overview:  <HomeIcon size={16} />,
  links:     <LinkIcon size={16} />,
  analytics: <BarChartIcon size={16} />,
  members:   <UsersIcon size={16} />,
  settings:  <SettingsIcon size={16} />,
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
        gap: 10,
        width: '100%',
        padding: '9px 14px 9px 18px',
        border: 'none',
        borderRadius: 7,
        cursor: 'pointer',
        /* Only a left border accent — no background tint */
        backgroundColor: isSelected ? 'rgba(255,255,255,0.05)' : 'transparent',
        color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.45)',
        fontFamily: 'inherit',
        fontSize: '13.5px',
        fontWeight: isSelected ? 500 : 400,
        textAlign: 'left',
        transition: 'color 0.12s ease, background-color 0.12s ease',
        marginBottom: 1,
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'
          ;(e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'
          ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
        }
      }}
    >
      {/* #FF4602 left border — ONLY on active items */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 3,
          height: isSelected ? 18 : 0,
          borderRadius: '0 3px 3px 0',
          backgroundColor: '#FF4602',
          transition: 'height 0.15s ease',
        }}
      />
      {/* Icon */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          color: isSelected ? '#FF4602' : 'rgba(255,255,255,0.4)',
          transition: 'color 0.12s ease',
          flexShrink: 0,
        }}
      >
        {NAV_ICONS[item.id]}
      </span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {/* Hotkey chip */}
      <span
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.25)',
          fontWeight: 400,
          letterSpacing: '0.03em',
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4,
          padding: '1px 5px',
          lineHeight: 1.6,
        }}
      >
        {item.hotkey}
      </span>
    </button>
  )
}

export default function DashboardNavColumn() {
  const { activeOrg } = useOrganization()
  const pathname = useActivePathname()
  const section = dashboardSectionFromPathname(pathname, activeOrg.slug)
  const items = getDashboardNavItems(activeOrg.slug)
  const brand = getOrganizationBrand(activeOrg.id)

  const mainNavItems = items.filter((i) => i.id !== 'settings')
  const settingsItem = items.find((i) => i.id === 'settings')

  const initials = activeOrg.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div
      style={{
        width: 240,
        minWidth: 200,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        /* Slightly lighter dark than the rail */
        backgroundColor: '#111111',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Workspace header */}
      <div
        style={{
          padding: '18px 14px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: brand.accentMuted,
            border: `1.5px solid ${brand.accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: brand.accent,
            flexShrink: 0,
            letterSpacing: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: '#fff',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activeOrg.name}
          </div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>
            Workspace
          </div>
        </div>
      </div>

      {/* Quick create */}
      <div style={{ padding: '12px 14px 6px' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            padding: '8px 14px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            backgroundColor: '#FF4602',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 13.5,
            fontWeight: 600,
            letterSpacing: '0.01em',
          }}
        >
          <PlusIcon size={14} />
          Create link
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', margin: '8px 14px' }} />

      {/* Nav section label */}
      <div style={{ padding: '0 14px 6px' }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'rgba(255,255,255,0.25)',
            padding: '4px 4px',
          }}
        >
          Navigation
        </div>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: '0 8px', overflowY: 'auto' }}>
        {mainNavItems.map((item) => (
          <NavLinkItem
            key={item.id}
            item={item}
            isSelected={
              item.id === 'overview' ? section === 'overview' : section === item.id
            }
          />
        ))}
      </div>

      {/* Footer — settings */}
      <div style={{ padding: '8px 8px 16px' }}>
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
        {settingsItem && (
          <NavLinkItem
            item={settingsItem}
            isSelected={section === 'settings'}
          />
        )}
      </div>
    </div>
  )
}
