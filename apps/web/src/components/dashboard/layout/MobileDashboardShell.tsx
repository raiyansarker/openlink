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

/** The FAB hovers above the capsule: bar (72px incl. padding) + 12px offset + air. */
const FAB_BOTTOM = 'calc(84px + env(safe-area-inset-bottom))'

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
          // Clears the floating bar (12px offset + 76px of bar) plus air, so
          // the last of every page scrolls out from behind the glass.
          paddingBlockEnd: 'calc(108px + env(safe-area-inset-bottom))',
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
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              className="ol-focus-ring"
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => go(WorkspaceUrl.build(activeOrgSlug, tab.id))}
              style={{
                flex: 1,
                minHeight: 52,
                border: 'none',
                padding: 0,
                borderRadius: 999,
                // Active tab: brand-tinted pill inside the glass — the
                // capsule keeps its frost and the pill marks the section.
                background: isActive ? DASHBOARD_NAV_SELECTED_BG : 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                cursor: 'pointer',
                color: isActive ? BRAND : SHELL_NAV_TEXT_SECONDARY,
                transition: 'background-color 0.15s ease',
              }}
            >
              <span style={{ display: 'flex' }}>{tab.icon}</span>
              <span style={{ fontSize: 10.5, fontWeight: 600 }}>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Floating create button — link writers only */}
      {canManageLinks ? (
        <button
          className="ol-focus-ring"
          type="button"
          aria-label="Create link"
          onClick={() => go('/create/link')}
          style={{
            position: 'absolute',
            right: 18,
            bottom: FAB_BOTTOM,
            width: 54,
            height: 54,
            borderRadius: 999,
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: BRAND,
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
          }}
        >
          <PlusIcon size={24} strokeWidth={1.6} />
        </button>
      ) : null}

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
