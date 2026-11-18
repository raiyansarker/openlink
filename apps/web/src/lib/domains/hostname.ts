import type { DnsRecord } from '#/lib/api/types'

const HOSTNAME_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

export function isValidCustomHostname(raw: string): boolean {
  const host = raw.trim().toLowerCase()
  if (!host || host.length > 253) return false
  if (host.includes('://') || host.includes('/')) return false
  return HOSTNAME_PATTERN.test(host)
}

export function purposeLabel(purpose: DnsRecord['purpose']): string {
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
