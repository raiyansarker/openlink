import { Text } from '@astryxdesign/core/Text'
import DashboardRecentLinksTable from './DashboardRecentLinksTable'
import type { Organization } from '#/data/demo/types'
import type { ShortLink } from '#/data/demo/types'

type DashboardLinksPanelProps = {
  organization: Organization
  links: ShortLink[]
}

export default function DashboardLinksPanel({
  organization,
  links,
}: DashboardLinksPanelProps) {
  return (
    <section className="openlink-detail-panel">
      <header className="openlink-detail-panel__header">
        <div>
          <Text type="display-3">Short links</Text>
          <Text type="supporting" color="secondary" size="sm">
            Sorted by clicks · demo fixtures for {organization.name}
          </Text>
        </div>
      </header>
      <div className="openlink-detail-panel__body">
        <DashboardRecentLinksTable organization={organization} links={links} />
      </div>
    </section>
  )
}
