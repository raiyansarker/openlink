import { useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import OrganizationLogo from '#/components/dashboard/icons/OrganizationLogo'
import {
  ActivityIcon,
  BarChartIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  DashboardIcon,
  GlobeIcon,
  LinkIcon,
  PlusIcon,
} from '#/components/icons/IcnMcp'
import { useOrganization } from '#/contexts/OrganizationContext'
import { usePermissions } from '#/hooks/use-permissions'
import { useActivePathname } from '#/hooks/useActivePathname'
import type { Workspace } from '#/lib/api/types'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import DashboardAccountMenu from './DashboardAccountMenu'
import {
  DASHBOARD_CONTENT_PANEL_BG,
  DASHBOARD_NAV_SELECTED_BG,
  DASHBOARD_SURFACE_BG,
  SHELL_CHROME_BORDER,
  SHELL_NAV_TEXT_SECONDARY,
  SHELL_NAV_TEXT_PRIMARY,
} from './dashboard-shell-colors'

/** The app's brand accent: active tab, active workspace, create button. */
const BRAND = 'var(--openlink-brand)'

/** Horizontal chrome the tab slots don't cover: the capsule's own padding
 *  (2 × 5px) plus the separator zone (15px) and the plus button (46px).
 *  The sliding pill sizes its slots against this. */
const TAB_STRIP_INSET_WRITER_PX = 71
const TAB_STRIP_INSET_VIEWER_PX = 10
const TAB_STRIP_DIVIDER_ZONE_PX = 15
const TAB_STRIP_PLUS_PX = 46

const TABS = [
  { id: 'overview', label: 'Home', icon: <DashboardIcon size={21} strokeWidth={1.2} /> },
  { id: 'activity', label: 'Activity', icon: <ActivityIcon size={21} strokeWidth={1.2} /> },
  { id: 'links', label: 'Links', icon: <LinkIcon size={21} strokeWidth={1.2} /> },
  { id: 'domains', label: 'Domains', icon: <GlobeIcon size={21} strokeWidth={1.2} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChartIcon size={21} strokeWidth={1.2} /> },
] as const

type TabId = (typeof TABS)[number]['id']

type MobileDashboardShellProps = {
  organizations: Workspace[]
  activeOrgSlug: string
  children: ReactNode
}

/**
 * Phone-width app shell (≤ 767px), swapped in by ThreeColumnDashboardLayout:
 *
 *   ┌────────────────────────────┐
 *   │ [💎 Acme v]          [👤]  │  workspace pill → bottom sheet; account menu
 *   ├────────────────────────────┤
 *   │          content           │  full-bleed, scrolls, safe distance from the FAB
 *   │                       (＋) │  floating create (writers only)
 *   ├────────────────────────────┤
 *   │ Home Activity Links ...    │  bottom tabs, brand-tinted active state
 *   └────────────────────────────┘
 *
 * Workspace switching is a native-looking bottom sheet, not a drawer — the
 * pill in the header is the only switcher affordance.
 */
export default function MobileDashboardShell({
  organizations,
  activeOrgSlug,
  children,
}: MobileDashboardShellProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const navigate = useNavigate()
  const pathname = useActivePathname()
  const { activeOrg } = useOrganization()
  const { canManageLinks } = usePermissions()
  const activeTab = WorkspaceUrl.sectionOf(pathname, activeOrgSlug) as TabId | 'settings'
  // Index of the selected tab; -1 when the path is outside the five tabs.
  const activeTabIndex = TABS.findIndex((tab) => tab.id === activeTab)
  // Viewers get a five-slot capsule (no create action), so the sliding
  // pill sizes its slots against a different inset than writers.
  const tabStripInset = canManageLinks ? TAB_STRIP_INSET_WRITER_PX : TAB_STRIP_INSET_VIEWER_PX

  const go = (to: string) => void navigate({ to })
  const switchOrg = (org: Workspace) => {
    setIsSheetOpen(false)
    go(WorkspaceUrl.replaceOrg(pathname, org.slug))
  }

  const createWorkspace = () => {
    setIsSheetOpen(false)
    go('/create/organization')
  }

  return (
    <VStack
      gap={0}
      hAlign="stretch"
      width="100%"
      height="100dvh"
      style={{ overflow: 'hidden', backgroundColor: DASHBOARD_CONTENT_PANEL_BG, position: 'relative' }}
    >
      {/* Header: workspace switcher + account */}
      <HStack
        vAlign="center"
        gap={3}
        width="fill"
        style={{
          minHeight: 56,
          padding: '10px 16px',
          boxSizing: 'border-box',
          borderBottom: SHELL_CHROME_BORDER,
          flexShrink: 0,
          // The chrome sits on its own surface, a step away from the
          // content's panel colour — the bar reads as app chrome, not page.
          backgroundColor: DASHBOARD_SURFACE_BG,
        }}
      >
        {/* Switcher chrome is flat text, not a pill — the sheet below
            carries the logos, names and roles. The current workspace still
            rides along for screen readers. */}
        <button
          className="ol-focus-ring"
          type="button"
          aria-label={`Switch workspace (current: ${activeOrg.name})`}
          onClick={() => setIsSheetOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px 4px 0',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
            maxWidth: '100%',
            minWidth: 0,
            color: SHELL_NAV_TEXT_PRIMARY,
          }}
        >
          <Text weight="semibold" maxLines={1}>
            Workspace
          </Text>
          <span style={{ display: 'flex', flexShrink: 0, color: SHELL_NAV_TEXT_SECONDARY }}>
            <ChevronDownIcon size={14} />
          </span>
        </button>
        <span style={{ flex: 1 }} />
        <DashboardAccountMenu />
      </HStack>

      {/* Content: full-bleed — pages carry their own Section inset, so the
          horizontal padding stays a single 6–8px, not two stacked ones. */}
      <div
        className="settings-content-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          // Clears the floating bar (12px offset + 58px of capsule) plus
          // air, so the last of every page scrolls out from behind the glass.
          paddingBlockEnd: 'calc(96px + env(safe-area-inset-bottom))',
          borderRadius: 0,
          border: 'none',
          backgroundColor: DASHBOARD_CONTENT_PANEL_BG,
        }}
      >
        {children}
      </div>

      {/* Floating tab bar, the new iOS style: detached capsule of frosted
          glass hovering at the safe area, content passing under the blur. */}
      <nav
        aria-label="Sections"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'row',
          padding: '5px',
          borderRadius: 999,
          // Frosted glass: translucent above the scrolling page colour,
          // with the blur doing the "frost".
          backgroundColor: 'color-mix(in oklab, var(--color-background-body) 64%, transparent)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          border: '1px solid light-dark(rgba(15, 17, 21, 0.1), rgba(255, 255, 255, 0.14))',
          boxShadow: '0 10px 32px rgba(0, 0, 0, 0.16)',
        }}
      >
        {/* The active pill is one element that glides between tabs —
            the iOS slide — instead of per-tab backgrounds cutting in and
            out. cubic-bezier(0.32, 0.72, 0, 1) is the iOS sheet curve.
            The slots exclude the capsule's padding and the plus zone. */}
        {activeTabIndex >= 0 ? (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 5,
              bottom: 5,
              left: `calc(5px + (100% - ${tabStripInset}px) / ${TABS.length} * ${activeTabIndex})`,
              width: `calc((100% - ${tabStripInset}px) / ${TABS.length})`,
              borderRadius: 999,
              backgroundColor: DASHBOARD_NAV_SELECTED_BG,
              transition: 'left 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          />
        ) : null}
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              className="ol-focus-ring"
              type="button"
              aria-current={isActive ? 'page' : undefined}
              // Icon-only in the capsule; the label stays with screen
              // readers via aria-label.
              aria-label={tab.label}
              onClick={() => go(WorkspaceUrl.build(activeOrgSlug, tab.id))}
              style={{
                flex: 1,
                minHeight: 48,
                border: 'none',
                padding: 0,
                borderRadius: 999,
                // The sliding pill lives behind the row; the button itself
                // stays transparent and only its ink crossfades.
                position: 'relative',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isActive ? BRAND : SHELL_NAV_TEXT_SECONDARY,
                transition: 'color 0.22s ease',
              }}
            >
              {tab.icon}
            </button>
          )
        })}
        {/* Create lives in the capsule but stays separated: a hairline
            divides it from navigation, and the brand tint marks it as an
            action, not a tab. Link writers only. */}
        {canManageLinks ? (
          <>
            <span
              aria-hidden
              style={{
                width: 1,
                height: 22,
                margin: `0 ${(TAB_STRIP_DIVIDER_ZONE_PX - 1) / 2}px`,
                alignSelf: 'center',
                flexShrink: 0,
                backgroundColor: 'light-dark(rgba(15, 17, 21, 0.12), rgba(255, 255, 255, 0.16))',
              }}
            />
            <button
              className="ol-focus-ring"
              type="button"
              aria-label="Create link"
              onClick={() => go('/create/link')}
              style={{
                  width: TAB_STRIP_PLUS_PX,
                minHeight: 48,
                flexShrink: 0,
                border: 'none',
                padding: 0,
                borderRadius: 999,
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: BRAND,
                transition: 'color 0.22s ease',
              }}
            >
              <PlusIcon size={22} strokeWidth={1.8} />
            </button>
          </>
        ) : null}
      </nav>

      {/* Workspace switcher: rises from the bottom, like an app */}
      <BottomSheet
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        label="Switch workspace"
        purpose="info"
        height="capped"
      >
        <VStack gap={3} hAlign="stretch" width="100%">
          <VStack gap={0.5} hAlign="start">
            <Text weight="semibold">Workspaces</Text>
            <Text type="supporting" color="secondary">
              Your role shows next to each workspace.
            </Text>
          </VStack>
          <VStack gap={1} hAlign="stretch" width="100%">
            {organizations.map((org) => {
              const isActive = org.slug === activeOrgSlug
              return (
                <button
                  key={org.id}
                  className="ol-focus-ring"
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => switchOrg(org)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    minHeight: 52,
                    padding: '8px 10px',
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    backgroundColor: isActive ? DASHBOARD_NAV_SELECTED_BG : 'transparent',
                    color: SHELL_NAV_TEXT_PRIMARY,
                  }}
                >
                  <OrganizationLogo
                    name={org.name}
                    size={28}
                    radius={8}
                    customImageUrl={org.logoUrl}
                  />
                  <VStack gap={0} hAlign="start" style={{ flex: 1, minWidth: 0 }}>
                    <Text weight={isActive ? 'semibold' : 'medium'} maxLines={1}>
                      {org.name}
                    </Text>
                    <Text type="supporting" color="secondary">
                      {workspaceMemberRoleLabel(org.role)}
                    </Text>
                  </VStack>
                  {isActive ? (
                    <span style={{ display: 'flex', color: BRAND, flexShrink: 0 }}>
                      <CircleCheckIcon size={18} />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </VStack>
          <button
            className="ol-focus-ring"
            type="button"
            onClick={createWorkspace}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              minHeight: 48,
              padding: '8px 10px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              backgroundColor: 'transparent',
              color: SHELL_NAV_TEXT_SECONDARY,
            }}
          >
            <span style={{ display: 'flex' }}>
              <PlusIcon size={16} />
            </span>
            <Text weight="medium">Create workspace</Text>
          </button>
        </VStack>
      </BottomSheet>
    </VStack>
  )
}
