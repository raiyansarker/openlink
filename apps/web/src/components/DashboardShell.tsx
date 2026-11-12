import { OrganizationProvider } from '#/contexts/OrganizationContext'
import type { ReactNode } from 'react'

type DashboardShellProps = {
  orgIdFromRoute: string
  children: ReactNode
}

/** Data + route shell only — dashboard chrome will be rebuilt on top. */
export default function DashboardShell({
  orgIdFromRoute,
  children,
}: DashboardShellProps) {
  return (
    <OrganizationProvider orgIdFromRoute={orgIdFromRoute}>
      <main>{children}</main>
    </OrganizationProvider>
  )
}
