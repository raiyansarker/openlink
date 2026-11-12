import { AppShell } from '@astryxdesign/core/AppShell'
import { OrganizationProvider, useOrganization } from '#/contexts/OrganizationContext'
import { useActivePathname } from '#/hooks/useActivePathname'
import DashboardContentFrame from './DashboardContentFrame'
import DashboardSideNav from './DashboardSideNav'
import DashboardTopNav from './DashboardTopNav'
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
  const pathname = useActivePathname()

  return (
    <AppShell
      topNav={
        <DashboardTopNav
          organizations={organizations}
          activeOrgId={activeOrgId}
          onOrgChange={setActiveOrgId}
        />
      }
      sideNav={<DashboardSideNav pathname={pathname} />}
      contentPadding={4}
    >
      <DashboardContentFrame orgId={activeOrg.id}>{children}</DashboardContentFrame>
    </AppShell>
  )
}
