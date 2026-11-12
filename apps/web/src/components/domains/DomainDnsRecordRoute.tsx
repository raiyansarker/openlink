import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import CopyValueButton from '#/components/common/CopyValueButton'
import RouteRail from '#/components/common/RouteRail'
import type { DomainDnsRecord } from '#/data/demo/domains'
import {
  dnsRecordFqdn,
  dnsRecordNameLabel,
} from '#/lib/domains/dns-record-display'

type DomainDnsRecordRouteProps = {
  record: DomainDnsRecord
  domainHostname: string
}

export default function DomainDnsRecordRoute({
  record,
  domainHostname,
}: DomainDnsRecordRouteProps) {
  const fqdn = dnsRecordFqdn(record.host, domainHostname)
  const isRouting = record.purpose === 'routing'

  return (
    <HStack gap={3} vAlign="stretch" width="100%">
      <RouteRail />
      <VStack gap={3} hAlign="start" width="100%">
        <VStack gap={1} hAlign="start">
          <Text type="supporting" color="secondary">
            {isRouting ? 'Visitors open' : 'Prove ownership of'}
          </Text>
          <CopyValueButton
            display={fqdn}
            copyValue={dnsRecordNameLabel(record.host)}
          />
        </VStack>
        <VStack gap={1} hAlign="start">
          <Text type="supporting" color="secondary">
            {isRouting ? 'Routes through' : 'TXT value at your DNS'}
          </Text>
          <CopyValueButton display={record.value} />
        </VStack>
      </VStack>
    </HStack>
  )
}
