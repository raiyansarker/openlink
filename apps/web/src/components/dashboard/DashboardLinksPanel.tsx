import { Section } from '@astryxdesign/core/Section'
import { VStack } from '@astryxdesign/core/VStack'
import DashboardPageHeader from './DashboardPageHeader'
import DashboardRecentLinksTable from './DashboardRecentLinksTable'

export default function DashboardLinksPanel() {
  return (
    <Section padding={6}>
      <VStack gap={4}>
        <DashboardPageHeader
          title="Links"
          subtitle="Every short link in this organization."
        />
        <DashboardRecentLinksTable />
      </VStack>
    </Section>
  )
}
