import { type } from 'arktype'

import { OrganizationIdPath } from '../organizations/schema'

export const DomainReadiness = type(
  "'pending' | 'verifying' | 'active' | 'failed' | 'removing'",
)

export const DnsRecordInstruction = type({
  type: 'string',
  host: 'string',
  value: 'string',
  purpose: "'routing' | 'ownership' | 'certificate'",
  'status?': "'required' | 'verified' | 'failed'",
})

export const AddDomainRequest = type({
  hostname: 'string',
})

export const CustomDomain = type({
  id: 'string',
  organizationId: 'string',
  hostname: 'string',
  readiness: DomainReadiness,
  dnsRecords: DnsRecordInstruction.array(),
  createdAt: 'string',
  'activeAt?': 'string',
  /** Short links on this domain. Removing the domain deletes them. */
  linkCount: 'number.integer>=0',
})

export const DomainIdPath = type({
  organizationId: 'string',
  domainId: 'string',
})

export const ListDomainsResponse = type({
  items: CustomDomain.array(),
})

export { OrganizationIdPath }
