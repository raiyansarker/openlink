import type { DomainDnsRecord } from '#/data/demo/domains'

// Record names: see `DnsRecordName` (the SDK returns full names, so never append the domain again).

export function dnsValueFieldLabel(record: DomainDnsRecord): string {
  if (record.type === 'CNAME') return 'Points to'
  if (record.type === 'TXT') return 'Value'
  if (record.type === 'A' || record.type === 'AAAA') return 'Address'
  return 'Value'
}
