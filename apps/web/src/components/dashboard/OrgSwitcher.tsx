import { Selector } from '@astryxdesign/core/Selector'
import type { Organization } from '#/data/demo/types'

type OrgSwitcherProps = {
  organizations: Organization[]
  activeOrgId: string
  onOrgChange: (orgId: string) => void
}

export default function OrgSwitcher({
  organizations,
  activeOrgId,
  onOrgChange,
}: OrgSwitcherProps) {
  const options = organizations.map((org) => ({
    label: org.name,
    value: org.id,
    description: `${org.memberCount} members · ${org.plan}`,
  }))

  return (
    <Selector
      label="Organization"
      isLabelHidden
      variant="secondary"
      options={options}
      value={activeOrgId}
      onChange={(value) => {
        if (typeof value === 'string') {
          onOrgChange(value)
        }
      }}
    />
  )
}
