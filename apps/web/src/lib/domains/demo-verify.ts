import type { WorkspaceCustomDomain } from '#/data/demo/domains'

export function demoVerifyDomain(
  domain: WorkspaceCustomDomain,
): WorkspaceCustomDomain {
  const verifiedRecords = domain.dnsRecords.map((record) => ({
    ...record,
    status:
      record.status === 'failed'
        ? ('required' as const)
        : ('verified' as const),
  }))

  if (domain.readiness === 'pending' || domain.readiness === 'failed') {
    return {
      ...domain,
      readiness: 'verifying',
      dnsRecords: verifiedRecords.map((r) =>
        r.purpose === 'routing' ? { ...r, status: 'required' as const } : r,
      ),
    }
  }

  return {
    ...domain,
    readiness: 'active',
    activeAt: domain.activeAt ?? new Date().toISOString(),
    dnsRecords: verifiedRecords,
  }
}
