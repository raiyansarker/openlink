import { Link } from '@tanstack/react-router'
import { Badge } from '@astryxdesign/core/Badge'
import { Button } from '@astryxdesign/core/Button'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import { getDashboardNavItems } from '#/lib/dashboard/nav-items'
import { dashboardSectionFromPathname } from '#/lib/dashboard/build-org-path'
import type { Organization } from '#/data/demo/types'

type DashboardNavColumnProps = {
  organization: Organization
  pathname: string
}

export default function DashboardNavColumn({
  organization,
  pathname,
}: DashboardNavColumnProps) {
  const navItems = getDashboardNavItems(organization.id)
  const activeSection = dashboardSectionFromPathname(pathname, organization.id)

  return (
    <nav className="openlink-dashboard__nav" aria-label={`${organization.name} menu`}>
      <Stack gap={1}>
        <Text type="display-3">{organization.name}</Text>
        <Text type="supporting" color="secondary" size="sm">
          {organization.id}
        </Text>
        <Stack direction="horizontal" gap={1} vAlign="center">
          <Badge variant="neutral" label={organization.plan} />
          <Text type="supporting" color="secondary" size="sm">
            {organization.memberCount} members
          </Text>
        </Stack>
      </Stack>

      <div className="openlink-dashboard__nav-links">
        {navItems.map((item) => {
          const active = activeSection === item.id
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
          URL includes org id: /dashboard/{organization.id}
        </Text>
      </Stack>
    </nav>
  )
}
