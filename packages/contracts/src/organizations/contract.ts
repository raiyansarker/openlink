import { type } from 'arktype'

import { oc, openapi } from '../oc'
import {
  AcceptInviteRequest,
  CreateOrganizationInviteRequest,
  CreateOrganizationRequest,
  ListOrganizationsResponse,
  Organization,
  OrganizationIdPath,
  OrganizationInvite,
  OrganizationMembership,
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
      summary: 'Create an organization (invite token required)',
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

export const contract = {
  listOrganizations,
  createOrganization,
  acceptOrganizationInvite,
  getOrganization,
  createOrganizationInvite,
} as const
