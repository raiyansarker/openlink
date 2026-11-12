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

export const RedirectStatus = type('301 | 302 | 307 | 308')

export const CustomDomain = type({
  id: 'string',
  organizationId: 'string',
  hostname: 'string',
  readiness: DomainReadiness,
  dnsRecords: DnsRecordInstruction.array(),
  'defaultRedirectStatus?': RedirectStatus,
  createdAt: 'string',
  'activeAt?': 'string',
})

export const DomainIdPath = type({
  organizationId: 'string',
  domainId: 'string',
})

export const ListDomainsResponse = type({
  items: CustomDomain.array(),
})

export { OrganizationIdPath }
