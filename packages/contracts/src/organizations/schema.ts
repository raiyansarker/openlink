import { type } from 'arktype'

import { Email } from '../schema-utils'

export const OrganizationRole = type("'owner' | 'admin' | 'member' | 'viewer'")
export const OrganizationInviteRole = type("'admin' | 'member' | 'viewer'")

export const Organization = type({
  id: 'string',
  name: 'string',
  slug: 'string',
  /** Uploaded logo, served from this app. */
  'logoUrl?': 'string',
  createdAt: 'string',
})

export const OrganizationMembership = type({
  organization: Organization,
  role: OrganizationRole,
  joinedAt: 'string',
})

/**
 * A workspace logo: a PNG, JPEG, WebP or GIF of at most 1 MB, sent as a file
 * field in a `multipart/form-data` body. The browser app sends a 256px WebP.
 */
export const OrganizationLogo = type.instanceOf(Blob)

export const CreateOrganizationRequest = type({
  name: 'string',
  /** The workspace URL. Left out, one is generated from the name and made unique. */
  'slug?': /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /** Stored with the workspace in the same request; a bad image creates nothing. */
  'logo?': OrganizationLogo,
})

export const CreateOrganizationInviteRequest = type({
  email: Email,
  role: OrganizationInviteRole,
})

export const OrganizationInvite = type({
  id: 'string',
  organizationId: 'string',
  email: Email,
  role: OrganizationInviteRole,
  expiresAt: 'string',
})

export const OrganizationIdPath = type({ organizationId: 'string' })

export const ListOrganizationsResponse = type({
  items: OrganizationMembership.array(),
})

export const WorkspaceMember = type({
  userId: 'string',
  name: 'string',
  email: Email,
  'image?': 'string',
  role: OrganizationRole,
  joinedAt: 'string',
})

export const ListMembersResponse = type({
  items: WorkspaceMember.array(),
})

export const PendingInvite = type({
  id: 'string',
  organizationId: 'string',
  email: Email,
  role: OrganizationInviteRole,
  expiresAt: 'string',
  createdAt: 'string',
})

export const ListInvitesResponse = type({
  items: PendingInvite.array(),
})

export const MemberIdPath = type({
  organizationId: 'string',
  userId: 'string',
})

export const InviteIdPath = type({
  organizationId: 'string',
  inviteId: 'string',
})

export const UpdateMemberRoleRequest = type({
  role: OrganizationInviteRole,
})

export const UpdateOrganizationRequest = type({
  'name?': 'string>=1',
  'slug?': /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /** A file replaces the logo; `null` (in a JSON body) removes it; leave it out to keep it. */
  'logo?': OrganizationLogo.or('null'),
})

export const TransferOwnershipRequest = type({
  userId: 'string',
})
