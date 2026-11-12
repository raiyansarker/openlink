import { Icon } from '@astryxdesign/core/Icon'
import { Badge } from '@astryxdesign/core/Badge'
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav'
import { dashboardPaths } from '#/lib/dashboard/route-paths'
import {
  isDashboardAnalyticsPath,
  isDashboardLinksPath,
  isDashboardMembersPath,
  isDashboardOverviewPath,
  isDashboardSettingsPath,
} from '#/lib/dashboard/match-route'

type DashboardSideNavProps = {
  pathname: string
}

export default function DashboardSideNav({ pathname }: DashboardSideNavProps) {
  return (
    <SideNav aria-label="Dashboard">
      <SideNavHeading heading="OpenLink" subheading="Link shortener" />
      <SideNavSection title="Main" isHeaderHidden>
        <SideNavItem
          label="Overview"
          href={dashboardPaths.root}
          icon={<Icon icon="search" />}
          isSelected={isDashboardOverviewPath(pathname)}
        />
        <SideNavItem
          label="Links"
          href={dashboardPaths.links}
          icon={<Icon icon="externalLink" />}
          isSelected={isDashboardLinksPath(pathname)}
        />
        <SideNavItem
          label="Analytics"
          href={dashboardPaths.analytics}
          icon={<Icon icon="viewColumns" />}
          isSelected={isDashboardAnalyticsPath(pathname)}
          endContent={<Badge variant="neutral" label="Demo" />}
        />
      </SideNavSection>
      <SideNavSection title="Organization">
        <SideNavItem
          label="Members"
          href={dashboardPaths.members}
          icon={<Icon icon="wrench" />}
          isSelected={isDashboardMembersPath(pathname)}
        />
        <SideNavItem
          label="Settings"
          href={dashboardPaths.settings}
          icon={<Icon icon="wrench" />}
          isSelected={isDashboardSettingsPath(pathname)}
        />
      </SideNavSection>
    </SideNav>
  )
}
