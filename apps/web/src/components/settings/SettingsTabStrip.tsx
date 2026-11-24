import { Link } from '@tanstack/react-router'
import { HStack } from '@astryxdesign/core/HStack'
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea'
import type { CSSProperties } from 'react'
import { useActivePathname } from '#/hooks/useActivePathname'
import { useWorkspaceDirectory } from '#/contexts/WorkspaceDirectoryContext'
import { isAdmin } from '#/lib/perms/permissions'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import {
  SETTINGS_USER_SECTIONS,
  SETTINGS_WORKSPACE_SECTIONS,
  type SettingsSection,
  type SettingsWorkspaceSection,
} from '#/lib/settings/sections'
import {
  DASHBOARD_NAV_SELECTED_BG,
  SHELL_CHROME_BORDER,
  SHELL_NAV_TEXT_SECONDARY,
} from '#/components/dashboard/layout/dashboard-shell-colors'

/** The app's brand accent: the active chip reads as the current section. */
const BRAND = 'var(--openlink-brand)'

const chipBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '6px 12px',
  borderRadius: 999,
  border: SHELL_CHROME_BORDER,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12.5,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
  flexShrink: 0,
}

/**
 * Phone navigation for Settings: a horizontally scrollable chip strip under
 * the nav bar (App-Store-style "Today/Games/…" chips), replacing the
 * desktop 35% nav column — on a phone that column strangles the content.
 *
 * Section visibility matches SettingsNavColumn: workspace sections hide once
 * we know there are no workspaces, and webhooks/API keys are admin-only.
 */
export default function SettingsTabStrip() {
  const pathname = useActivePathname()
  const { organizations, status } = useWorkspaceDirectory()

  // Hide workspace sections only once we know there are none (not while loading).
  const hasNoWorkspaces = status === 'ready' && organizations.length === 0
  const activeOrg = ActiveWorkspace.pick(organizations)
  const sectionVisible = (section: SettingsWorkspaceSection) =>
    section !== 'integrations' && section !== 'api-keys'
      ? true
      : activeOrg?.role
        ? isAdmin(activeOrg.role)
        : false

  const items: { label: string; section: SettingsSection }[] = [
    ...SETTINGS_USER_SECTIONS,
    ...(hasNoWorkspaces ? [] : SETTINGS_WORKSPACE_SECTIONS.filter((s) => sectionVisible(s.id))),
  ].map((item) => ({ label: item.label, section: item.id }))

  const isActive = (to: string) =>
    pathname === to || pathname.startsWith(`${to}/`) || (to === '/settings/profile' && pathname === '/settings')

  return (
    <nav
      aria-label="Settings sections"
      style={{
        flexShrink: 0,
        borderBottom: SHELL_CHROME_BORDER,
        padding: '10px 16px 12px',
        boxSizing: 'border-box',
        backgroundColor: 'transparent',
      }}
    >
      <ScrollableArea axis="inline" label="Settings sections" width="fill">
        <HStack gap={2}>
          {items.map((item) => {
            const active = isActive(`/settings/${item.section}`)
            return (
              <Link
                key={item.section}
                to={`/settings/${item.section}`}
                className="ol-focus-ring"
                aria-current={active ? 'page' : undefined}
                style={{
                  ...chipBaseStyle,
                  color: active ? BRAND : SHELL_NAV_TEXT_SECONDARY,
                  backgroundColor: active ? DASHBOARD_NAV_SELECTED_BG : 'transparent',
                  borderColor: active ? 'transparent' : SHELL_CHROME_BORDER,
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </HStack>
      </ScrollableArea>
    </nav>
  )
}
