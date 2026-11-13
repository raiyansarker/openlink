export type DomainReadiness = 'active' | 'verifying' | 'pending' | 'failed'

export type DomainDnsPurpose = 'routing' | 'ownership' | 'certificate'

export type DomainDnsRecordStatus = 'required' | 'verified' | 'failed'

export type DomainDnsRecord = {
  type: string
  host: string
  value: string
  purpose: DomainDnsPurpose
  status: DomainDnsRecordStatus
}

export type WorkspaceCustomDomain = {
  id: string
  orgId: string
  hostname: string
  readiness: DomainReadiness
  linkCount: number
  createdAt: string
  activeAt?: string
  dnsRecords: DomainDnsRecord[]
}

/** No custom domains ship with the demo; workspaces start on the default host. */
export const demoCustomDomains: WorkspaceCustomDomain[] = []
