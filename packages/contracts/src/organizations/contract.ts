import { type } from 'arktype'

import { oc, openapi } from '../oc'
import { EmptyResponse } from '../system/schema'
import {
  AcceptInviteRequest,
  CreateOrganizationInviteRequest,
  CreateOrganizationRequest,
  InviteIdPath,
  ListInvitesResponse,
  ListMembersResponse,
  ListOrganizationsResponse,
  MemberIdPath,
  Organization,
  OrganizationIdPath,
  OrganizationInvite,
  OrganizationMembership,
  TransferOwnershipRequest,
  UpdateMemberRoleRequest,
  UpdateOrganizationRequest,
  WorkspaceMember,
} from './schema'

export const listOrganizations = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'listOrganizations',
      path: '/organizations',
      tags: ['Organizations'],
    }),
  )
  .output(ListOrganizationsResponse)

export const createOrganization = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'createOrganization',
      path: '/organizations',
      successStatus: 201,
      summary: 'Create a workspace; the first one completes onboarding',
      inputStructure: 'detailed',
      tags: ['Organizations'],
    }),
  )
  .input(type({ body: CreateOrganizationRequest }))
  .output(Organization)

export const acceptOrganizationInvite = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'acceptOrganizationInvite',
      path: '/organizations/invites/accept',
      inputStructure: 'detailed',
      tags: ['Organizations'],
    }),
  )
  .input(type({ body: AcceptInviteRequest }))
  .output(OrganizationMembership)

export const getOrganization = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'getOrganization',
      path: '/organizations/{organizationId}',
      inputStructure: 'detailed',
      tags: ['Organizations'],
    }),
  )
  .input(type({ params: OrganizationIdPath }))
  .output(Organization)

export const createOrganizationInvite = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'createOrganizationInvite',
      path: '/organizations/{organizationId}/invites',
      successStatus: 201,
      inputStructure: 'detailed',
      tags: ['Organizations'],
    }),
  )
  .input(
    type({
      body: CreateOrganizationInviteRequest,
      params: OrganizationIdPath,
    }),
  )
  .output(OrganizationInvite)

const orgOp = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  operationId: string,
  path: `/${string}`,
  extra: { successStatus?: 201 | 204; summary?: string } = {},
) =>
  oc.meta(
    openapi({
      method,
      operationId,
      path,
      inputStructure: 'detailed',
      tags: ['Organizations'],
      ...extra,
    }),
  )

export const updateOrganization = orgOp('PATCH', 'updateOrganization', '/organizations/{organizationId}')
  .input(type({ body: UpdateOrganizationRequest, params: OrganizationIdPath }))
  .output(Organization)

export const deleteOrganization = orgOp('DELETE', 'deleteOrganization', '/organizations/{organizationId}', {
  successStatus: 204,
  summary: 'Delete a workspace (owner only)',
})
  .input(type({ params: OrganizationIdPath }))
  .output(EmptyResponse)

export const transferOwnership = orgOp(
  'POST',
  'transferOwnership',
  '/organizations/{organizationId}/transfer-ownership',
  { summary: 'Hand ownership to another member (owner only)' },
)
  .input(type({ body: TransferOwnershipRequest, params: OrganizationIdPath }))
  .output(Organization)

export const listMembers = orgOp('GET', 'listMembers', '/organizations/{organizationId}/members')
  .input(type({ params: OrganizationIdPath }))
  .output(ListMembersResponse)

export const updateMemberRole = orgOp(
  'PATCH',
  'updateMemberRole',
  '/organizations/{organizationId}/members/{userId}',
)
  .input(type({ body: UpdateMemberRoleRequest, params: MemberIdPath }))
  .output(WorkspaceMember)

export const removeMember = orgOp(
  'DELETE',
  'removeMember',
  '/organizations/{organizationId}/members/{userId}',
  { successStatus: 204, summary: 'Remove a member, or leave the workspace' },
)
  .input(type({ params: MemberIdPath }))
  .output(EmptyResponse)

export const listOrganizationInvites = orgOp('GET', 'listOrganizationInvites', '/organizations/{organizationId}/invites')
  .input(type({ params: OrganizationIdPath }))
  .output(ListInvitesResponse)

export const resendOrganizationInvite = orgOp(
  'POST',
  'resendOrganizationInvite',
  '/organizations/{organizationId}/invites/{inviteId}/resend',
  { summary: 'Issue a fresh token and expiry for a pending invite' },
)
  .input(type({ params: InviteIdPath }))
  .output(OrganizationInvite)

export const revokeOrganizationInvite = orgOp(
  'DELETE',
  'revokeOrganizationInvite',
  '/organizations/{organizationId}/invites/{inviteId}',
  { successStatus: 204 },
)
  .input(type({ params: InviteIdPath }))
  .output(EmptyResponse)

export const contract = {
  listOrganizations,
  createOrganization,
  acceptOrganizationInvite,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  transferOwnership,
  createOrganizationInvite,
  listOrganizationInvites,
  resendOrganizationInvite,
  revokeOrganizationInvite,
  listMembers,
  updateMemberRole,
  removeMember,
} as const
