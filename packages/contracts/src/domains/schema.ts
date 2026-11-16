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
  /** Short links on this domain. Removing the domain deletes them unless they are moved first. */
  linkCount: 'number.integer>=0',
})

/** Removing a domain: by default its links are deleted with it. */
export const RemoveDomainQuery = type({
  /** Move the links first: another active domain's id, or `default` for the app's own host. */
  'moveLinksTo?': 'string',
})

/** `moveLinksTo` value for the app's own host. */
export const DEFAULT_DOMAIN_TARGET = 'default'

export const DomainIdPath = type({
  organizationId: 'string',
  domainId: 'string',
})

export const ListDomainsResponse = type({
  items: CustomDomain.array(),
})

export { OrganizationIdPath }
