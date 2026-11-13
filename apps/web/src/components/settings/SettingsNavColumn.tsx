import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  SETTINGS_USER_SECTIONS,
  SETTINGS_WORKSPACE_SECTIONS,
  buildSettingsPath,
  type SettingsSection,
} from '#/lib/settings/sections'
import { SETTINGS_SECTION_ICONS } from './settings-nav-icons'
import { LogOutIcon } from '#/components/icons/IcnMcp'
import {
  DASHBOARD_NAV_HOVER_BG,
  DASHBOARD_NAV_SELECTED_BG,
  SHELL_NAV_GROUP_LABEL,
  SHELL_NAV_ICON_COLOR,
  SHELL_NAV_TEXT_PRIMARY,
  SHELL_NAV_TEXT_SECONDARY,
} from '#/components/dashboard/layout/dashboard-shell-colors'

const NAV_COLUMN_WIDTH = 228
const NAV_ITEM_TRANSITION = 'background-color 0.14s ease'

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
  textDecoration: 'none',
  fontSize: 12.5,
  cursor: 'pointer',
  border: 'none',
  fontFamily: 'inherit',
  textAlign: 'left',
  boxSizing: 'border-box',
  transition: NAV_ITEM_TRANSITION,
}

function ChevronBackIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 3.5 5.5 8 10 12.5" />
    </svg>
  )
}

function SettingsNavLink({
  section,
  label,
  activeSection,
}: {
  section: SettingsSection
  label: string
  activeSection: string
}) {
  const [hovered, setHovered] = useState(false)
  const selected = activeSection === section
  return (
    <Link
      to={buildSettingsPath(section)}
      style={{
        ...navLinkBaseStyle,
        fontWeight: selected ? 600 : 400,
        color: selected ? SHELL_NAV_TEXT_PRIMARY : SHELL_NAV_TEXT_SECONDARY,
        backgroundColor: navItemBackground(selected, hovered),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span
        style={{
          display: 'flex',
          color: selected ? SHELL_NAV_TEXT_PRIMARY : SHELL_NAV_ICON_COLOR,
          flexShrink: 0,
        }}
      >
        {SETTINGS_SECTION_ICONS[section]}
      </span>
      {label}
    </Link>
  )
}

function GroupLabel({ children }: { children: string }) {
  return (
    <span
      style={{
        display: 'block',
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: SHELL_NAV_GROUP_LABEL,
        padding: '0 8px 5px',
      }}
    >
      {children}
    </span>
  )
}

function NavGroup({
  label,
  children,
  isFirst = false,
}: {
  label: string
  children: import('react').ReactNode
  isFirst?: boolean
}) {
  return (
    <div style={{ marginBottom: 20, marginTop: isFirst ? 0 : 0 }}>
      <GroupLabel>{label}</GroupLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'stretch' }}>
        {children}
      </div>
    </div>
  )
}

export default function SettingsNavColumn() {
  const navigate = useNavigate()
  const { section } = useParams({ strict: false }) as { section?: string }
  const activeSection = section ?? 'profile'
  const [logoutHovered, setLogoutHovered] = useState(false)

  return (
    <div
      style={{
        width: NAV_COLUMN_WIDTH,
        maxWidth: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 10px 24px 12px',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        aria-label="Back to dashboard"
        onClick={() => void navigate({ to: '/dashboard' })}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 0',
          marginBottom: 18,
          marginLeft: -3,
          alignSelf: 'flex-start',
          border: 'none',
          borderRadius: 0,
          cursor: 'pointer',
          backgroundColor: 'transparent',
          color: SHELL_NAV_TEXT_PRIMARY,
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'inherit',
          letterSpacing: '-0.02em',
        }}
      >
        <ChevronBackIcon />
        Settings
      </button>

      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        <NavGroup label="User" isFirst>
          {SETTINGS_USER_SECTIONS.map((item) => (
            <SettingsNavLink
              key={item.id}
              section={item.id}
              label={item.label}
              activeSection={activeSection}
            />
          ))}
        </NavGroup>

        <NavGroup label="Workspace">
          {SETTINGS_WORKSPACE_SECTIONS.map((item) => (
            <SettingsNavLink
              key={item.id}
              section={item.id}
              label={item.label}
              activeSection={activeSection}
            />
          ))}
        </NavGroup>

        <NavGroup label="Other">
          <button
            type="button"
            onClick={() => {}}
            style={{
              ...navLinkBaseStyle,
              color: 'var(--color-text-error)',
              fontWeight: 500,
              backgroundColor: logoutHovered ? DASHBOARD_NAV_HOVER_BG : 'transparent',
            }}
            onMouseEnter={() => setLogoutHovered(true)}
            onMouseLeave={() => setLogoutHovered(false)}
            onFocus={() => setLogoutHovered(true)}
            onBlur={() => setLogoutHovered(false)}
          >
            <span style={{ display: 'flex', color: 'var(--color-text-error)' }}>
              <LogOutIcon size={16} strokeWidth={1.2} />
            </span>
            Log out
          </button>
        </NavGroup>
      </nav>
    </div>
  )
}
