import type { DnsRecord } from '#/lib/api/types'

// Record names: see `DnsRecordName` (the SDK returns full names, so never append the domain again).

export function dnsValueFieldLabel(record: DnsRecord): string {
  if (record.type === 'CNAME') return 'Points to'
  if (record.type === 'TXT') return 'Value'
  if (record.type === 'A' || record.type === 'AAAA') return 'Address'
  return 'Value'
}
