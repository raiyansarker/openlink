import { useNavigate } from '@tanstack/react-router'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import { VStack } from '@astryxdesign/core/VStack'
import { Button } from '@astryxdesign/core/Button'
import type { Organization } from '#/data/demo/types'
import { getOrganizationBrand } from '#/data/demo/organization-branding'
import { replaceOrgInPathname } from '#/lib/dashboard/build-org-path'
import { dashboardChromeStyles } from '#/lib/stylex/dashboard-chrome.stylex'
import OrganizationLogo from '#/components/dashboard/icons/OrganizationLogo'
import { useActivePathname } from '#/hooks/useActivePathname'

type OrganizationIconRailProps = {
  organizations: Organization[]
  activeOrgSlug: string
}

export default function OrganizationIconRail({
  organizations,
  activeOrgSlug,
}: OrganizationIconRailProps) {
  const pathname = useActivePathname()
  const navigate = useNavigate()

  return (
    <VStack
      gap={2}
      padding={2}
      vAlign="start"
      hAlign="center"
      width={56}
      xstyle={dashboardChromeStyles.orgRail}
    >
      {organizations.map((org) => {
        const brand = getOrganizationBrand(org.id)
        const target = replaceOrgInPathname(pathname, org.slug)
        const isActive = org.slug === activeOrgSlug

        return (
          <Tooltip key={org.id} content={org.name} placement="end">
            <Button
              variant="ghost"
              label={`Switch to ${org.name}`}
              isIconOnly
              xstyle={[
                dashboardChromeStyles.orgSwitch,
                isActive && dashboardChromeStyles.orgSwitchActive,
              ]}
              onClick={() => {
                void navigate({ to: target })
              }}
            >
              <OrganizationLogo icon={brand.icon} size={32} />
            </Button>
          </Tooltip>
        )
      })}
    </VStack>
  )
}
