import type { DomainReadiness } from '#/data/demo/domains'

export type DomainStatusDotVariant = 'success' | 'warning' | 'neutral'

export type DomainStatusMeta = {
  readiness: DomainReadiness
  label: string
  description: string
  dotVariant: DomainStatusDotVariant
}

const STATUS_META: Record<DomainReadiness, DomainStatusMeta> = {
  active: {
    readiness: 'active',
    label: 'Active',
    description: 'DNS verified — short links can use this host',
    dotVariant: 'success',
  },
  verifying: {
    readiness: 'verifying',
    label: 'Verifying',
    description: 'Checking DNS — propagation can take up to 48 hours',
    dotVariant: 'warning',
  },
  pending: {
    readiness: 'pending',
    label: 'Finish DNS setup',
    description:
      'Copy the records below into your DNS provider, then verify when they are live.',
    dotVariant: 'warning',
  },
  failed: {
    readiness: 'failed',
    label: 'Misconfigured',
    description: 'DNS does not match — update records and verify again',
    dotVariant: 'neutral',
  },
}

export function domainStatusMeta(readiness: DomainReadiness): DomainStatusMeta {
  return STATUS_META[readiness] ?? STATUS_META.pending
}
