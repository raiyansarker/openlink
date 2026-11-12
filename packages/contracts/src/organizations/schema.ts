import { type } from 'arktype'

import { Email } from '../schema-utils'

export const OrganizationRole = type("'admin' | 'member'")

export const Organization = type({
  id: 'string',
  name: 'string',
  slug: 'string',
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
  inviteToken: 'string',
})

export const CreateOrganizationInviteRequest = type({
  email: Email,
  role: OrganizationRole,
})

export const AcceptInviteRequest = type({
  token: 'string',
})

export const OrganizationInvite = type({
  id: 'string',
  organizationId: 'string',
  email: Email,
  role: OrganizationRole,
  expiresAt: 'string',
  'token?': 'string',
})

export const OrganizationIdPath = type({ organizationId: 'string' })

export const ListOrganizationsResponse = type({
  items: OrganizationMembership.array(),
})
