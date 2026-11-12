import { Section } from '@astryxdesign/core/Section'
import { Stack } from '@astryxdesign/core/Stack'
import { Text } from '@astryxdesign/core/Text'
import type { Organization } from '#/data/demo/types'

type DashboardOrgHeaderProps = {
  organization: Organization
}

export default function DashboardOrgHeader({
  organization,
}: DashboardOrgHeaderProps) {
  return (
    <Section>
      <Stack gap={1}>
        <Text type="display-2">{organization.name}</Text>
        <Text type="supporting" color="secondary">
          {organization.plan} plan · {organization.memberCount} members · demo
          data
        </Text>
      </Stack>
    </Section>
  )
}
