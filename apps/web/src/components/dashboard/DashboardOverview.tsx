import { Heading } from '@astryxdesign/core/Heading'
import { Section } from '@astryxdesign/core/Section'
import { useOrganization } from '#/contexts/OrganizationContext'

export default function DashboardOverview() {
  const { activeOrg } = useOrganization()

  return (
    <Section padding={6}>
      <Heading level={1}>Dashboard</Heading>
      <Heading level={3} color="secondary">
        {activeOrg.name}
      </Heading>
    </Section>
  )
}
