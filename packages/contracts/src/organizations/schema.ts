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

export const CreateOrganizationRequest = type({
  name: 'string',
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  /** Optional; a bootstrap invite is consumed when one is given. */
  'inviteToken?': 'string',
})

export const CreateOrganizationInviteRequest = type({
  email: Email,
  role: OrganizationInviteRole,
})

export const AcceptInviteRequest = type({
  token: 'string',
})

export const OrganizationInvite = type({
  id: 'string',
  organizationId: 'string',
  email: Email,
  role: OrganizationInviteRole,
  expiresAt: 'string',
  'token?': 'string',
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
})

export const TransferOwnershipRequest = type({
  userId: 'string',
})
