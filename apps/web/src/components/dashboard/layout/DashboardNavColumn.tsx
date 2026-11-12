import { useNavigate } from '@tanstack/react-router'
import { Icon } from '@astryxdesign/core/Icon'
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav'
import { Badge } from '@astryxdesign/core/Badge'
import { Text } from '@astryxdesign/core/Text'
import { Section } from '@astryxdesign/core/Section'
import { useOrganization } from '#/contexts/OrganizationContext'
import { getDashboardNavItems } from '#/lib/dashboard/nav-items'
import { dashboardSectionFromPathname } from '#/lib/dashboard/build-org-path'
import { useActivePathname } from '#/hooks/useActivePathname'
import type { DashboardNavItem } from '#/lib/dashboard/nav-items'
import type { ReactNode } from 'react'

const NAV_ICONS: Record<string, ReactNode> = {
  overview: <Icon icon="viewColumns" size="sm" />,
  links: <Icon icon="externalLink" size="sm" />,
  analytics: <Icon icon="arrowsUpDown" size="sm" />,
  members: <Icon icon="menu" size="sm" />,
  settings: <Icon icon="wrench" size="sm" />,
}

function planLabel(plan: string): string {
  if (plan === 'enterprise') return 'Enterprise'
  if (plan === 'pro') return 'Pro'
  return 'Free'
}

function NavLinkItem({ item, isSelected }: { item: DashboardNavItem; isSelected: boolean }) {
  const navigate = useNavigate()

  return (
    <SideNavItem
      label={item.label}
      icon={NAV_ICONS[item.id]}
      isSelected={isSelected}
      onClick={() => {
        void navigate({ to: item.href })
      }}
      endContent={
        <Text type="supporting" color="secondary">
          {item.hotkey}
        </Text>
      }
    />
  )
}

export default function DashboardNavColumn() {
  const { activeOrg } = useOrganization()
  const pathname = useActivePathname()
  const section = dashboardSectionFromPathname(pathname, activeOrg.slug)
  const items = getDashboardNavItems(activeOrg.slug)

  return (
    <Section variant="section" height="fill" padding={0} dividers={['end']}>
      <SideNav
        collapsible
        resizable={{ defaultWidth: 272, minWidth: 232, maxWidth: 360 }}
        header={
          <SideNavHeading
            heading={activeOrg.name}
            subheading="Workspace"
            headerEndContent={<Badge variant="neutral" label={planLabel(activeOrg.plan)} />}
          />
        }
      >
        <SideNavSection title="Navigation">
          {items.map((item) => (
            <NavLinkItem
              key={item.id}
              item={item}
              isSelected={
                item.id === 'overview' ? section === 'overview' : section === item.id
              }
            />
          ))}
        </SideNavSection>
      </SideNav>
    </Section>
  )
}
