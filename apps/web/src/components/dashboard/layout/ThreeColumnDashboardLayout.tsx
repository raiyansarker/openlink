import { AppShell } from '@astryxdesign/core/AppShell'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import type { ReactNode } from 'react'
import type { Organization } from '#/data/demo/types'
import OrganizationIconRail from './OrganizationIconRail'
import DashboardNavColumn from './DashboardNavColumn'

type ThreeColumnDashboardLayoutProps = {
  organizations: Organization[]
  activeOrgSlug: string
  children: ReactNode
}

export default function ThreeColumnDashboardLayout({
  organizations,
  activeOrgSlug,
  children,
}: ThreeColumnDashboardLayoutProps) {
  return (
    <AppShell
      height="fill"
      variant="wash"
      contentPadding={0}
      sideNav={
        <HStack gap={0} height="fill" vAlign="stretch" width="auto">
          <OrganizationIconRail
            organizations={organizations}
            activeOrgSlug={activeOrgSlug}
          />
          <DashboardNavColumn />
        </HStack>
      }
    >
      <Layout
        height="fill"
        content={<LayoutContent isScrollable>{children}</LayoutContent>}
      />
    </AppShell>
  )
}
