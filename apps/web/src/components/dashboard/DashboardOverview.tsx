import { Section } from '@astryxdesign/core/Section'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Card } from '@astryxdesign/core/Card'
import { useOrganization } from '#/contexts/OrganizationContext'
import { buildDashboardStatCards } from '#/lib/dashboard/build-stat-cards'

export default function DashboardOverview() {
  const { activeOrg, stats, links } = useOrganization()
  const cards = buildDashboardStatCards(stats)

  return (
    <Section padding={6}>
      <VStack gap={6}>
        <VStack gap={1}>
          <Heading level={2}>Dashboard</Heading>
          <Text color="secondary">
            {activeOrg.name} — metrics and recent links (demo data).
          </Text>
        </VStack>

        <HStack gap={4} wrap="wrap">
          {cards.map((card) => (
            <Card key={card.label} padding={4} width={200}>
              <VStack gap={1}>
                <Text type="supporting" color="secondary">
                  {card.label}
                </Text>
                <Heading level={3}>{card.value}</Heading>
                <Text type="supporting" color="secondary">
                  {card.detail}
                </Text>
              </VStack>
            </Card>
          ))}
        </HStack>

        <VStack gap={2}>
          <Heading level={3}>Recent links</Heading>
          <Text color="secondary">
            {links.length} link{links.length === 1 ? '' : 's'} in this workspace — full table
            coming next.
          </Text>
        </VStack>
      </VStack>
    </Section>
  )
}
