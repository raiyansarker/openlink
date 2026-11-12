import { OrganizationProvider, useOrganization } from '#/contexts/OrganizationContext'
import { useActivePathname } from '#/hooks/useActivePathname'
import DashboardDetailColumn from './layout/DashboardDetailColumn'
import DashboardNavColumn from './layout/DashboardNavColumn'
import OrganizationIconRail from './layout/OrganizationIconRail'
import ThreeColumnDashboardLayout from './layout/ThreeColumnDashboardLayout'
import type { ReactNode } from 'react'

type DashboardShellProps = {
  orgIdFromRoute: string
  children: ReactNode
}

/** App chrome: org icon rail, org nav column, detail column. */
export default function DashboardShell({
  orgIdFromRoute,
  children,
}: DashboardShellProps) {
  return (
    <OrganizationProvider orgIdFromRoute={orgIdFromRoute}>
      <DashboardChrome>{children}</DashboardChrome>
    </OrganizationProvider>
  )
}

function DashboardChrome({ children }: { children: ReactNode }) {
  const { organizations, activeOrg, activeOrgId } = useOrganization()
  const pathname = useActivePathname()

  return (
    <ThreeColumnDashboardLayout
      rail={
        <OrganizationIconRail
          organizations={organizations}
          activeOrgId={activeOrgId}
          pathname={pathname}
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
