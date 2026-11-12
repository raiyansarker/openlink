import { OrganizationProvider, useOrganization } from '#/contexts/OrganizationContext'
import { useActivePathname } from '#/hooks/useActivePathname'
import DashboardDetailColumn from './layout/DashboardDetailColumn'
import DashboardNavColumn from './layout/DashboardNavColumn'
import OrganizationIconRail from './layout/OrganizationIconRail'
import ThreeColumnDashboardLayout from './layout/ThreeColumnDashboardLayout'
import type { ReactNode } from 'react'

type DashboardShellProps = {
  children: ReactNode
}

/** App chrome: org icon rail, org nav column, detail column. */
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
    <ThreeColumnDashboardLayout
      rail={
        <OrganizationIconRail
          organizations={organizations}
          activeOrgId={activeOrgId}
          onSelectOrg={setActiveOrgId}
        />
      }
      navigation={
        <DashboardNavColumn organization={activeOrg} pathname={pathname} />
      }
      detail={
        <DashboardDetailColumn orgId={activeOrg.id}>{children}</DashboardDetailColumn>
      }
    />
  )
}
