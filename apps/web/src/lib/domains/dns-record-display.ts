import type { DomainDnsRecord } from '#/data/demo/domains'

/** Label shown in the DNS provider “Name” / “Host” field. */
export function dnsRecordNameLabel(host: string): string {
  if (host === '@') return '@'
  return host
}

export function dnsNameFieldCaption(
  host: string,
  domainHostname: string,
): string {
  if (host === '@') {
    return `Root of ${domainHostname}`
  }
  const zone = stripLeadingSubdomain(domainHostname, host)
  return `Resolves to ${host}.${zone}`
}

function stripLeadingSubdomain(hostname: string, sub: string): string {
  if (hostname.startsWith(`${sub}.`)) {
    return hostname.slice(sub.length + 1)
  }
  return hostname
}

/** Full hostname this DNS row applies to (what visitors will use). */
export function dnsRecordFqdn(host: string, domainHostname: string): string {
  if (host === '@') return domainHostname
  if (domainHostname.startsWith(`${host}.`)) return domainHostname
  const zone = stripLeadingSubdomain(domainHostname, host)
  return `${host}.${zone}`
}

export function dnsValueFieldLabel(record: DomainDnsRecord): string {
  if (record.type === 'CNAME') return 'Points to'
  if (record.type === 'TXT') return 'Value'
  if (record.type === 'A' || record.type === 'AAAA') return 'Address'
  return 'Value'
}
