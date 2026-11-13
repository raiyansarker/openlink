import type { DomainReadiness } from '#/data/demo/domains'

export type DomainStatusFilter = 'all' | DomainReadiness

export const DOMAIN_STATUS_FILTER_OPTIONS: {
  value: DomainStatusFilter
  label: string
}[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'verifying', label: 'Verifying' },
  { value: 'pending', label: 'Pending DNS' },
  { value: 'failed', label: 'Misconfigured' },
]

export function matchesDomainSearch(hostname: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return hostname.toLowerCase().includes(q)
}

export function matchesDomainStatusFilter(
  readiness: DomainReadiness,
  filter: DomainStatusFilter,
): boolean {
  if (filter === 'all') return true
  return readiness === filter
}
