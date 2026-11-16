import { type } from 'arktype'

import { HttpUrl } from '../schema-utils'
import { DomainIdPath, RedirectStatus } from '../domains/schema'
import { LinkHold, LinkTargeting, SocialPreview } from './delivery'
import { OrganizationIdPath } from '../organizations/schema'

/** Team notes on a link (stored as its `description`). */
export const MAX_LINK_NOTES_LENGTH = 5000

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
  /** Null means the app's own host (the default domain). */
  domainId: 'string | null',
  slug: 'string',
  'alias?': 'string',
  /** Containing folder; null or absent means the workspace root. */
  'folderId?': 'string | null',
  'title?': 'string',
  'description?': 'string',
  destinationUrl: HttpUrl,
  redirectStatus: RedirectStatus,
  status: LinkStatus,
  'enabled?': 'boolean',
  'activateAt?': 'string',
  'expiresAt?': 'string',
  'maxClicks?': 'number.integer>=1',
  clickCount: 'number.integer>=0',
  'passwordProtected?': 'boolean',
  'expiredDestinationUrl?': HttpUrl,
  'fallbackDestinationUrl?': HttpUrl,
  'tags?': 'string[]',
  'utm?': UtmParameters,
  'metadata?': type({ '[string]': 'unknown' }),
  /** Serves a placeholder page instead of redirecting while set (and before `releaseAt`). */
  'hold?': LinkHold,
  'targeting?': LinkTargeting,
  /** Shows the destination inside a frame so the short URL stays in the address bar. */
  'cloaked?': 'boolean',
  /** Card shown to social and chat crawlers instead of the destination's own. */
  'socialPreview?': SocialPreview,
  createdAt: 'string',
  updatedAt: 'string',
})

export const CreateLinkRequest = type({
  /** Custom domain to use; omit or null for the app's own host. Ignored on the per-domain route. */
  'domainId?': 'string | null',
  'slug?': /^[A-Za-z0-9_-]+$/,
  'folderId?': 'string | null',
  destinationUrl: HttpUrl,
  'title?': 'string',
  'description?': `string <= ${MAX_LINK_NOTES_LENGTH}`,
  'redirectStatus?': RedirectStatus,
  'activateAt?': 'string',
  'expiresAt?': 'string',
  'maxClicks?': 'number.integer>=1',
  'password?': 'string>=4',
  'expiredDestinationUrl?': HttpUrl,
  'fallbackDestinationUrl?': HttpUrl,
  'tags?': 'string[]',
  'utm?': UtmParameters,
  'metadata?': type({ '[string]': 'unknown' }),
  'hold?': LinkHold,
  'targeting?': LinkTargeting,
  'cloaked?': 'boolean',
  'socialPreview?': SocialPreview,
})

export const UpdateLinkRequest = type({
  /** Null moves the link to the workspace root. */
  'folderId?': 'string | null',
  'destinationUrl?': HttpUrl,
  'title?': 'string',
  /** For every optional setting below, null removes it and an absent field keeps it. */
  'description?': type(`string <= ${MAX_LINK_NOTES_LENGTH}`).or('null'),
  'redirectStatus?': RedirectStatus,
  'status?': LinkStatus,
  'enabled?': 'boolean',
  'activateAt?': 'string | null',
  'expiresAt?': 'string | null',
  'maxClicks?': type('number.integer>=1').or('null'),
  'password?': 'string>=4',
  'clearPassword?': 'boolean',
  'expiredDestinationUrl?': HttpUrl.or('null'),
  'fallbackDestinationUrl?': HttpUrl.or('null'),
  'tags?': 'string[]',
  'utm?': UtmParameters.or('null'),
  'metadata?': type({ '[string]': 'unknown' }).or('null'),
  'hold?': LinkHold.or('null'),
  'targeting?': LinkTargeting.or('null'),
  'cloaked?': 'boolean',
  'socialPreview?': SocialPreview.or('null'),
})

export const LinkIdPath = type({
  organizationId: 'string',
  domainId: 'string',
  linkId: 'string',
})

export const ListLinksResponse = type({
  items: Link.array(),
})

export { DomainIdPath, OrganizationIdPath }

/** Query params arrive as strings; `folderId=root` selects links not in any folder. */
export const ListOrganizationLinksQuery = type({
  'q?': 'string',
  'folderId?': 'string',
  'tag?': 'string',
  'status?': LinkStatus,
  'limit?': 'string.integer.parse',
  'offset?': 'string.integer.parse',
})

export const ListOrganizationLinksResponse = type({
  items: Link.array(),
  total: 'number.integer>=0',
})

const LinkIds = type('string[] >= 1').and(type('string[] <= 200'))

export const MoveLinksRequest = type({
  linkIds: LinkIds,
  /** Null moves the links to the workspace root. */
  folderId: 'string | null',
})

export const AddLinkTagsRequest = type({
  linkIds: LinkIds,
  tags: type('string[] >= 1').and(type('string[] <= 20')),
})

export const DeleteLinksRequest = type({ linkIds: LinkIds })

export const BulkLinksResponse = type({ affected: 'number.integer>=0' })

export const WorkspaceLinkIdPath = type({
  organizationId: 'string',
  linkId: 'string',
})
