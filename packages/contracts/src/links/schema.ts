import { type } from 'arktype'

import { DomainIdPath, RedirectStatus } from '../domains/schema'

export const LinkStatus = type(
  "'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'disabled'",
)

export const UtmParameters = type({
  'source?': 'string',
  'medium?': 'string',
  'campaign?': 'string',
  'term?': 'string',
  'content?': 'string',
})

export const Link = type({
  id: 'string',
  organizationId: 'string',
  domainId: 'string',
  slug: 'string',
  'alias?': 'string',
  'title?': 'string',
  'description?': 'string',
  destinationUrl: 'string.url',
  redirectStatus: RedirectStatus,
  status: LinkStatus,
  'enabled?': 'boolean',
  'activateAt?': 'string',
  'expiresAt?': 'string',
  'maxClicks?': 'number.integer>=1',
  clickCount: 'number.integer>=0',
  'passwordProtected?': 'boolean',
  'expiredDestinationUrl?': 'string.url',
  'fallbackDestinationUrl?': 'string.url',
  'tags?': 'string[]',
  'utm?': UtmParameters,
  'metadata?': type({ '[string]': 'unknown' }),
  createdAt: 'string',
  updatedAt: 'string',
})

export const CreateLinkRequest = type({
  'slug?': /^[A-Za-z0-9_-]+$/,
  destinationUrl: 'string.url',
  'title?': 'string',
  'description?': 'string',
  'redirectStatus?': RedirectStatus,
  'activateAt?': 'string',
  'expiresAt?': 'string',
  'maxClicks?': 'number.integer>=1',
  'password?': 'string>=4',
  'expiredDestinationUrl?': 'string.url',
  'fallbackDestinationUrl?': 'string.url',
  'tags?': 'string[]',
  'utm?': UtmParameters,
  'metadata?': type({ '[string]': 'unknown' }),
})

export const UpdateLinkRequest = type({
  'destinationUrl?': 'string.url',
  'title?': 'string',
  'description?': 'string',
  'redirectStatus?': RedirectStatus,
  'status?': LinkStatus,
  'enabled?': 'boolean',
  'activateAt?': 'string',
  'expiresAt?': 'string',
  'maxClicks?': 'number.integer>=1',
  'password?': 'string>=4',
  'clearPassword?': 'boolean',
  'expiredDestinationUrl?': 'string.url',
  'fallbackDestinationUrl?': 'string.url',
  'tags?': 'string[]',
  'utm?': UtmParameters,
  'metadata?': type({ '[string]': 'unknown' }),
})

export const LinkIdPath = type({
  organizationId: 'string',
  domainId: 'string',
  linkId: 'string',
})

export const ListLinksResponse = type({
  items: Link.array(),
})

export { DomainIdPath }
