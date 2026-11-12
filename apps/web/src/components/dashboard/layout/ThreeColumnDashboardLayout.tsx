import { AppShell } from '@astryxdesign/core/AppShell'
import { HStack } from '@astryxdesign/core/HStack'
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
      sideNav={
        <HStack gap={0} height="fill">
          <OrganizationIconRail
            organizations={organizations}
            activeOrgSlug={activeOrgSlug}
          />
          <DashboardNavColumn />
        </HStack>
      }
    >
      {children}
    </AppShell>
  )
}
