import type { DomainDnsRecord } from '#/data/demo/domains'

const HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

export function isValidCustomHostname(raw: string): boolean {
  const host = raw.trim().toLowerCase()
  if (!host || host.length > 253) return false
  if (host.includes('://') || host.includes('/')) return false
  return HOSTNAME_PATTERN.test(host)
}

function dnsHostFromHostname(hostname: string): string {
  const parts = hostname.split('.')
  if (parts.length <= 2) return '@'
  return parts[0] ?? '@'
}

function verificationToken(hostname: string): string {
  const slug = hostname.replace(/\./g, '-').replace(/[^a-z0-9-]/gi, '')
  const n = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, '0')
  return `ol-site-verification=${slug}-${n}`
}

export function demoDnsRecordsForHostname(hostname: string): DomainDnsRecord[] {
  const host = hostname.trim().toLowerCase()
  const recordHost = dnsHostFromHostname(host)
  return [
    {
      type: 'CNAME',
      host: recordHost,
      value: 'edge.openlink.dev',
      purpose: 'routing',
      status: 'required',
    },
    {
      type: 'TXT',
      host: recordHost,
      value: verificationToken(host),
      purpose: 'ownership',
      status: 'required',
    },
  ]
}

export function purposeLabel(purpose: DomainDnsRecord['purpose']): string {
  switch (purpose) {
    case 'routing':
      return 'Traffic'
    case 'ownership':
      return 'Verification'
    case 'certificate':
      return 'Certificate'
    default:
      return purpose
  }
}
