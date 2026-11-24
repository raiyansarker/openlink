import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { HStack } from '@astryxdesign/core/HStack'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import CreateLinkChromeButton from '#/components/dashboard/CreateLinkChromeButton'
import OrganizationLogo from '#/components/dashboard/icons/OrganizationLogo'
import { MenuIcon } from '#/components/icons/IcnMcp'
import { useOrganization } from '#/contexts/OrganizationContext'
import { usePermissions } from '#/hooks/use-permissions'
import { useActivePathname } from '#/hooks/useActivePathname'
import type { Workspace } from '#/lib/api/types'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import { getDashboardNavGroups } from '#/lib/dashboard/nav-items'
import { workspaceMemberRoleLabel } from '#/lib/members/role-label'
import DashboardAccountMenu from './DashboardAccountMenu'
import { NavLinkItem } from './DashboardNavColumn'
import {
  DASHBOARD_NAV_SELECTED_BG,
  DASHBOARD_SURFACE_BG,
  SHELL_CHROME_BORDER,
  SHELL_NAV_TEXT_PRIMARY,
} from './dashboard-shell-colors'

type MobileDashboardNavProps = {
  organizations: Workspace[]
  activeOrgSlug: string
}

/**
 * Responsive contract, phone widths (≤ 767px):
 *   Divide: the rail and nav column drop out; one region — content — remains.
 *   Reveal: the app bar (org + menu + account) takes their place; the slide-in
 *           drawer holds the org switcher, navigation, and create-link.
 *   Resize: tables scroll within the panel (Astryx Table's own scroll region);
 *           the panel keeps its chrome with a small inset.
 *   Swap:   driven by useMediaQuery in ThreeColumnDashboardLayout.
 */
export default function MobileDashboardNav({ organizations, activeOrgSlug }: MobileDashboardNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()
  const pathname = useActivePathname()
  const { activeOrg } = useOrganization()
  const { canManageLinks } = usePermissions()
  const groups = getDashboardNavGroups(activeOrgSlug)
  const section = WorkspaceUrl.sectionOf(pathname, activeOrgSlug)

  // The drawer closes on any navigation that changed the path — nav items
  // and org rows only navigate, so one effect covers them all.
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const openOrg = (org: Workspace) => {
    void navigate({ to: WorkspaceUrl.replaceOrg(pathname, org.slug) })
  }

  return (
    <>
      <HStack
        vAlign="center"
        gap={3}
        width="fill"
        style={{
          minHeight: 52,
          padding: '8px 14px',
          boxSizing: 'border-box',
          borderBottom: SHELL_CHROME_BORDER,
          backgroundColor: DASHBOARD_SURFACE_BG,
          flexShrink: 0,
        }}
      >
        <IconButton
          variant="ghost"
          size="sm"
          label="Open workspace menu"
          tooltip="Menu"
          icon={<MenuIcon size={18} strokeWidth={1.2} />}
          onClick={() => setIsMenuOpen(true)}
        />
        <OrganizationLogo
          name={activeOrg.name}
          size={26}
          radius={8}
          customImageUrl={activeOrg.logoUrl}
        />
        <Text weight="semibold" maxLines={1}>
          {activeOrg.name}
        </Text>
        <DashboardAccountMenu />
      </HStack>

      <Drawer
        isOpen={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        side="start"
        width={304}
        purpose="info"
        label="Workspace menu"
      >
        <Layout
          header={
            <DrawerHeader title={activeOrg.name} subtitle="Workspace menu" onOpenChange={setIsMenuOpen} />
          }
          content={
            <LayoutContent>
              <VStack gap={5} hAlign="stretch" width="100%">
                {organizations.length > 1 ? (
                  <VStack gap={1} hAlign="stretch" width="100%">
                    <Text type="supporting" color="secondary" weight="semibold">
                      Workspaces
                    </Text>
                    {organizations.map((org) => {
                      const isActive = org.slug === activeOrgSlug
                      return (
                        <button
                          key={org.id}
                          className="ol-focus-ring"
                          type="button"
                          aria-current={isActive ? 'true' : undefined}
                          onClick={() => openOrg(org)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            width: '100%',
                            padding: '6px 8px',
                            borderRadius: 7,
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
                            size={26}
                            radius={8}
                            customImageUrl={org.logoUrl}
                          />
                          <Text weight={isActive ? 'semibold' : 'medium'} maxLines={1}>
                            {org.name}
                          </Text>
                          {!isActive ? (
                            <Text type="supporting" color="secondary" style={{ marginInlineStart: 'auto' }}>
                              {workspaceMemberRoleLabel(org.role)}
                            </Text>
                          ) : null}
                        </button>
                      )
                    })}
                  </VStack>
                ) : null}

                {canManageLinks ? (
                  <CreateLinkChromeButton
                    layout="fill"
                    onClick={() =>
                      void navigate({ to: '/create/link', search: { org: activeOrgSlug } })
                    }
                  />
                ) : null}

                {groups.map((group, groupIndex) => (
                  <VStack key={group.id} gap={1} hAlign="stretch" width="100%">
                    {groupIndex === 0 ? null : (
                      <Text type="supporting" color="secondary" weight="semibold">
                        {group.label}
                      </Text>
                    )}
                    {group.items.map((item) => (
                      <NavLinkItem key={item.id} item={item} isSelected={section === item.id} />
                    ))}
                  </VStack>
                ))}

                <VStack gap={1} hAlign="stretch" width="100%">
                  <Text type="supporting" color="secondary" weight="semibold">
                    Account
                  </Text>
                  <NavLinkItem
                    item={{ id: 'settings', label: 'Settings', href: '/settings/profile' }}
                    isSelected={false}
                  />
                </VStack>
              </VStack>
            </LayoutContent>
          }
        />
      </Drawer>
    </>
  )
}
