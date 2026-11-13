import { Fragment } from 'react'
import { Divider } from '@astryxdesign/core/Divider'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import type { DomainDnsRecord } from '#/data/demo/domains'
import { purposeLabel } from '#/lib/domains/demo-dns'
import DomainDnsRecordRoute from './DomainDnsRecordRoute'

type DomainDnsRecordsTableProps = {
  domainHostname: string
  records: DomainDnsRecord[]
}

export default function DomainDnsRecordsTable({
  domainHostname,
  records,
}: DomainDnsRecordsTableProps) {
  return (
    <VStack gap={4} width="100%" hAlign="stretch">
      {records.map((record, index) => (
        <Fragment key={`${record.type}_${record.host}_${index}`}>
          {index > 0 ? <Divider variant="subtle" /> : null}
          <VStack gap={3} width="100%" hAlign="stretch">
            <HStack hAlign="between" vAlign="center" gap={2} width="100%">
              <Text weight="semibold">{record.type}</Text>
              <Text type="supporting" color="secondary">
                {purposeLabel(record.purpose)}
              </Text>
            </HStack>

            <DomainDnsRecordRoute
              record={record}
              domainHostname={domainHostname}
            />
          </VStack>
        </Fragment>
      ))}
    </VStack>
  )
}
