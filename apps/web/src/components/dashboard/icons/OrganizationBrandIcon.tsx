import { getOrganizationBrand } from '#/data/demo/organization-branding'
import { AcmeOrgIcon, DevRelOrgIcon, OpenLinkOrgIcon } from './OrgBrandIcons'

type OrganizationBrandIconProps = {
  orgId: string
  size?: number
}

export default function OrganizationBrandIcon({
  orgId,
  size = 22,
}: OrganizationBrandIconProps) {
  const brand = getOrganizationBrand(orgId)
  const iconProps = {
    width: size,
    height: size,
    style: { color: brand.accent },
  }

  switch (brand.icon) {
    case 'openlink':
      return <OpenLinkOrgIcon {...iconProps} />
    case 'acme':
      return <AcmeOrgIcon {...iconProps} />
    case 'devrel':
      return <DevRelOrgIcon {...iconProps} />
    default:
      return <OpenLinkOrgIcon {...iconProps} />
  }
}
