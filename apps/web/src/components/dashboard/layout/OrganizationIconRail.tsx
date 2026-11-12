import { useNavigate } from '@tanstack/react-router'
import { Tooltip } from '@astryxdesign/core/Tooltip'
import { VStack } from '@astryxdesign/core/VStack'
import { Section } from '@astryxdesign/core/Section'
import { Button } from '@astryxdesign/core/Button'
import type { Organization } from '#/data/demo/types'
import { getOrganizationBrand } from '#/data/demo/organization-branding'
import { replaceOrgInPathname } from '#/lib/dashboard/build-org-path'
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
    <Section
      variant="muted"
      padding={2}
      width={72}
      height="fill"
      dividers={['end']}
    >
      <VStack gap={2} vAlign="start" hAlign="center">
        {organizations.map((org) => {
          const brand = getOrganizationBrand(org.id)
          const target = replaceOrgInPathname(pathname, org.slug)
          const isActive = org.slug === activeOrgSlug

          return (
            <Tooltip key={org.id} content={org.name} placement="end">
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                elevation={isActive ? 'low' : 'none'}
                label={`Switch to ${org.name}`}
                isIconOnly
                icon={
                  <OrganizationLogo orgId={org.id} icon={brand.icon} size={36} />
                }
                onClick={() => {
                  void navigate({ to: target })
                }}
              />
            </Tooltip>
          )
        })}
      </VStack>
    </Section>
  )
}
