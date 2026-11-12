import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { OrganizationProvider } from '#/contexts/OrganizationContext'
import type { ReactNode } from 'react'

type DashboardShellProps = {
  orgSlugFromRoute: string
  children: ReactNode
}

export default function DashboardShell({
  orgSlugFromRoute,
  children,
}: DashboardShellProps) {
  return (
    <OrganizationProvider orgSlugFromRoute={orgSlugFromRoute}>
      <Layout
        height="fill"
        content={<LayoutContent isScrollable>{children}</LayoutContent>}
      />
    </OrganizationProvider>
  )
}
