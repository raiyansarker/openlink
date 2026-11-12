import { useRouterState } from '@tanstack/react-router'
import { AppShell } from '@astryxdesign/core/AppShell'
import { Icon } from '@astryxdesign/core/Icon'
import { Selector } from '@astryxdesign/core/Selector'
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav'
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav'
import { Button } from '@astryxdesign/core/Button'
import { Badge } from '@astryxdesign/core/Badge'
import { OrganizationProvider, useOrganization } from '#/contexts/OrganizationContext'
import type { ReactNode } from 'react'

type DashboardShellProps = {
  children: ReactNode
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <OrganizationProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </OrganizationProvider>
  )
}

function DashboardChrome({ children }: { children: ReactNode }) {
  const { organizations, activeOrg, activeOrgId, setActiveOrgId } =
    useOrganization()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const orgOptions = organizations.map((org) => ({
    label: org.name,
    value: org.id,
    description: `${org.memberCount} members · ${org.plan}`,
  }))

  const sideNav = (
    <SideNav aria-label="Dashboard">
      <SideNavHeading heading="OpenLink" subheading="Link shortener" />
      <SideNavSection title="Main" isHeaderHidden>
        <SideNavItem
          label="Overview"
          href="/dashboard"
          icon={<Icon icon="search" />}
          isSelected={pathname === '/dashboard'}
        />
        <SideNavItem
          label="Links"
          href="/dashboard/links"
          icon={<Icon icon="externalLink" />}
          isSelected={pathname.startsWith('/dashboard/links')}
        />
        <SideNavItem
          label="Analytics"
          href="/dashboard/analytics"
          icon={<Icon icon="viewColumns" />}
          isSelected={pathname.startsWith('/dashboard/analytics')}
          isDisabled
          endContent={
            <Badge variant="neutral" label="Soon" />
          }
        />
      </SideNavSection>
      <SideNavSection title="Organization">
        <SideNavItem
          label="Members"
          href="/dashboard/members"
          icon={<Icon icon="wrench" />}
          isDisabled
        />
        <SideNavItem
          label="Settings"
          href="/dashboard/settings"
          icon={<Icon icon="wrench" />}
          isDisabled
        />
      </SideNavSection>
    </SideNav>
  )

  const topNav = (
    <TopNav
      label="OpenLink dashboard"
      heading={
        <TopNavHeading heading="OpenLink" subheading="Dashboard" headingHref="/dashboard" />
      }
      endContent={
        <>
          <Selector
            label="Organization"
            isLabelHidden
            variant="secondary"
            options={orgOptions}
            value={activeOrgId}
            onChange={(value) => {
              if (typeof value === 'string') {
                setActiveOrgId(value)
              }
            }}
          />
          <Button label="Create link" variant="primary" isDisabled tooltip="Coming soon" />
        </>
      }
    >
      <TopNavItem
        label="Docs"
        href="https://github.com/openlink"
        target="_blank"
        rel="noopener noreferrer"
      />
    </TopNav>
  )

  return (
    <AppShell topNav={topNav} sideNav={sideNav} contentPadding={4}>
      <div
        key={activeOrg.id}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)', minHeight: '100%' }}
      >
        {children}
      </div>
    </AppShell>
  )
}
