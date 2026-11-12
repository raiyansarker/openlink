import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav'
import { dashboardPaths } from '#/lib/dashboard/route-paths'
import CreateLinkButton from './CreateLinkButton'
import OrgSwitcher from './OrgSwitcher'
import type { Organization } from '#/data/demo/types'

type DashboardTopNavProps = {
  organizations: Organization[]
  activeOrgId: string
  onOrgChange: (orgId: string) => void
}

export default function DashboardTopNav({
  organizations,
  activeOrgId,
  onOrgChange,
}: DashboardTopNavProps) {
  return (
    <TopNav
      label="OpenLink dashboard"
      heading={
        <TopNavHeading
          heading="OpenLink"
          subheading="Dashboard"
          headingHref={dashboardPaths.root}
        />
      }
      endContent={
        <>
          <OrgSwitcher
            organizations={organizations}
            activeOrgId={activeOrgId}
            onOrgChange={onOrgChange}
          />
          <CreateLinkButton />
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
}
