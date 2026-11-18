import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import CopyValueButton from '#/components/common/CopyValueButton'
import RouteRail from '#/components/common/RouteRail'
import type { DnsRecord } from '#/lib/api/types'
import { dnsValueFieldLabel } from '#/lib/domains/dns-record-display'
import { DnsRecordName } from '#/lib/domains/dns-record-name'

type DomainDnsRecordRouteProps = {
  record: DnsRecord
  domainHostname: string
}

/**
 * One record as it goes into a DNS provider: the Name/Host field (relative to
 * the zone, which most providers add themselves), then the value. The full
 * name is shown for providers that want it.
 */
export default function DomainDnsRecordRoute({ record, domainHostname }: DomainDnsRecordRouteProps) {
  const name = DnsRecordName.of(record.host, domainHostname)

  return (
    <HStack gap={3} vAlign="stretch" width="100%">
      <RouteRail />
      <VStack gap={3} hAlign="start" width="100%">
        <VStack gap={1} hAlign="start">
          <Text type="supporting" color="secondary">
            Name (in {name.zone})
          </Text>
          <CopyValueButton display={name.host} />
          {name.host !== name.fqdn ? (
            <Text type="supporting" color="secondary" style={{ overflowWrap: 'anywhere' }}>
              Full name: {name.fqdn}
            </Text>
          ) : null}
        </VStack>
        <VStack gap={1} hAlign="start">
          <Text type="supporting" color="secondary">
            {dnsValueFieldLabel(record)}
          </Text>
          <CopyValueButton display={record.value} />
        </VStack>
      </VStack>
    </HStack>
  )
}
