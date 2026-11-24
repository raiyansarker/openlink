import { useState, type CSSProperties, type ReactNode } from 'react'
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

/** One icon slot inside the tab capsule. Fixed, not flexed — the capsule
 *  shrinks to fit its five tabs instead of stretching edge-to-edge, so the
 *  row reads as one compact group and the create circle sits beside it. */
const TAB_SLOT_PX = 52
/** Padding inside the tab capsule; the sliding pill is inset by the same
 *  amount so it tracks the slots exactly. */
const CAPSULE_PAD_PX = 5
/** Width (and height) of the separate create circle. Taller than a slot so
 *  it reads as the row's primary action, the way iOS sizes it. */
const PLUS_CIRCLE_PX = 54

/** The shared "liquid glass" recipe for the floating chrome: a thin tint
 *  (42% body — any more and it reads opaque over body-coloured content)
 *  floating on a heavy blur with saturation boost for the frost, capped by
 *  a hairline border and one soft shadow so the pieces lift off the page. */
const GLASS_STYLE: CSSProperties = {
  backgroundColor: 'color-mix(in oklab, var(--color-background-body) 42%, transparent)',
  backdropFilter: 'blur(30px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(30px) saturate(1.8)',
  border: '1px solid light-dark(rgba(15, 17, 21, 0.1), rgba(255, 255, 255, 0.14))',
  boxShadow: '0 10px 28px rgba(0, 0, 0, 0.14)',
}

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
 *   │ Workspace v          [👤]  │  flat switcher → sheet; account menu
 *   ├────────────────────────────┤
 *   │          content            │  full-bleed, scrolls under the glass,
 *   │                            │  padded past the floating capsule
 *   │                            │
 *   │  ╭ ◌ ◌ ◌ ◌ ◌ ╮        (＋) │  two pieces of frosted glass: the compact
 *   └──┴─────────────┴──────────┴┘  tab capsule docks left, the brand-tinted
                                     create circle docks right (writers only)
 *
 * Workspace switching is an iOS bottom sheet opened from the header; the
 * account avatar mirrors it (profile, settings, sign out).
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

      {/* Floating chrome, the new iOS style: two pieces of frosted glass
          on one row — a compact capsule holding only the tabs, and a
          separate create circle beside it. The capsule anchors to the
          left edge, the circle to the right; content keeps scrolling
          under the blur. */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          // Docked split: tabs hug the left inset, the glass circle hugs
          // the right — like the iOS split between navigation and action.
          justifyContent: 'space-between',
          // The wrapper spans the full inset strip, but only the glass is
          // tappable — touches on the gaps pass through to the page.
          pointerEvents: 'none',
        }}
      >
        {/* Tab capsule: five fixed slots, no labels, compact by design. */}
        <nav
          aria-label="Sections"
          style={{
            ...GLASS_STYLE,
            position: 'relative',
            display: 'flex',
            flexDirection: 'row',
            padding: CAPSULE_PAD_PX,
            borderRadius: 999,
            pointerEvents: 'auto',
          }}
        >
          {/* The active pill is one element that glides between tabs —
              the iOS slide — instead of per-tab backgrounds cutting in
              and out. cubic-bezier(0.32, 0.72, 0, 1) is the iOS sheet
              curve. Fixed slots keep the math flat: left is just the
              capsule padding plus slot width × index. */}
          {activeTabIndex >= 0 ? (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: CAPSULE_PAD_PX,
                bottom: CAPSULE_PAD_PX,
                left: `${CAPSULE_PAD_PX + TAB_SLOT_PX * activeTabIndex}px`,
                width: TAB_SLOT_PX,
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
                  width: TAB_SLOT_PX,
                  height: 48,
                  border: 'none',
                  padding: 0,
                  borderRadius: 999,
                  // The sliding pill lives behind the row; the button
                  // itself stays transparent and only its ink crossfades.
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
        </nav>

        {/* Create is its own piece of glass, not a tab: a separate circle
            docked to the right edge of the row. The frost is brand-tinted —
            the accent lives in the glass, iOS style — so it stays
            translucent like the capsule while reading as the primary
            action. Link writers only. */}
        {canManageLinks ? (
          <button
            className="ol-focus-ring"
            type="button"
            aria-label="Create link"
            onClick={() => go('/create/link')}
            style={{
              ...GLASS_STYLE,
              // Same frost, accent ink: the brand tint replaces the neutral
              // fill so the circle stays see-through, matching iOS accent
              // glass. The hairline border follows the tint.
              backgroundColor: 'color-mix(in oklab, var(--openlink-brand) 20%, transparent)',
              borderColor: 'color-mix(in oklab, var(--openlink-brand) 32%, transparent)',
              flexShrink: 0,
              width: PLUS_CIRCLE_PX,
              height: PLUS_CIRCLE_PX,
              padding: 0,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: BRAND,
              transition: 'color 0.22s ease',
              pointerEvents: 'auto',
            }}
          >
            <PlusIcon size={22} strokeWidth={1.8} />
          </button>
        ) : null}
      </div>

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
