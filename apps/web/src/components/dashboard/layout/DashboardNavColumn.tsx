import { Link } from '@tanstack/react-router'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { dashboardNavItems } from '#/lib/dashboard/nav-items'
import {
  isDashboardAnalyticsPath,
  isDashboardLinksPath,
  isDashboardMembersPath,
  isDashboardOverviewPath,
  isDashboardSettingsPath,
} from '#/lib/dashboard/match-route'
import type { Organization } from '#/data/demo/types'

type DashboardNavColumnProps = {
  organization: Organization
  pathname: string
}

function isNavItemActive(pathname: string, href: string): boolean {
  if (href.endsWith('/dashboard') || href === '/dashboard') {
    return isDashboardOverviewPath(pathname)
  }
  if (href.includes('/links')) {
    return isDashboardLinksPath(pathname)
  }
  if (href.includes('/analytics')) {
    return isDashboardAnalyticsPath(pathname)
  }
  if (href.includes('/members')) {
    return isDashboardMembersPath(pathname)
  }
  if (href.includes('/settings')) {
    return isDashboardSettingsPath(pathname)
  }
  return pathname.startsWith(href)
}

export default function DashboardNavColumn({
  organization,
  pathname,
}: DashboardNavColumnProps) {
  return (
    <nav className="openlink-dashboard__nav" aria-label={`${organization.name} menu`}>
      <Stack gap={1}>
        <Text type="display-3">{organization.name}</Text>
        <Stack direction="horizontal" gap={1} vAlign="center">
          <Badge variant="neutral" label={organization.plan} />
          <Text type="supporting" color="secondary" size="sm">
            {organization.memberCount} members
          </Text>
        </Stack>
      </Stack>

      <div className="openlink-dashboard__nav-links">
        {dashboardNavItems.map((item) => {
          const active = isNavItemActive(pathname, item.href)
          return (
            <Link
              key={item.id}
              to={item.href}
              className="openlink-nav-link"
              data-active={active}
            >
              <span className="openlink-nav-link__label">{item.label}</span>
              {item.description ? (
                <span className="openlink-nav-link__hint">{item.description}</span>
              ) : null}
            </Link>
          )
        })}
      </div>

      <Stack gap={2}>
        <Button
          label="New short link"
          variant="primary"
          width="100%"
          isDisabled
          tooltip="API coming soon"
        />
        <Text type="supporting" color="secondary" size="sm">
          Demo workspace — data is local fixtures.
        </Text>
      </Stack>
    </nav>
  )
}
