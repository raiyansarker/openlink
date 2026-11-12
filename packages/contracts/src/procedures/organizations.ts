import { oc } from '@orpc/contract'
import { type } from 'arktype'

import {
  AcceptInviteRequest,
  CreateOrganizationInviteRequest,
  CreateOrganizationRequest,
  ListOrganizationsResponse,
  Organization,
  OrganizationIdPath,
  OrganizationInvite,
  OrganizationMembership,
} from '../models'

export const listOrganizations = oc
  .route({
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'listOrganizations',
    path: '/organizations',
    tags: ['Organizations'],
  })
  .output(ListOrganizationsResponse)

export const createOrganization = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'createOrganization',
    path: '/organizations',
    successStatus: 201,
    summary: 'Create an organization (invite token required)',
    tags: ['Organizations'],
  })
  .input(type({ body: CreateOrganizationRequest }))
  .output(Organization)

export const acceptOrganizationInvite = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'acceptOrganizationInvite',
    path: '/organizations/invites/accept',
    tags: ['Organizations'],
  })
  .input(type({ body: AcceptInviteRequest }))
  .output(OrganizationMembership)

export const getOrganization = oc
  .route({
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'getOrganization',
    path: '/organizations/{organizationId}',
    tags: ['Organizations'],
  })
  .input(type({ params: OrganizationIdPath }))
  .output(Organization)

export const createOrganizationInvite = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'createOrganizationInvite',
    path: '/organizations/{organizationId}/invites',
    successStatus: 201,
    tags: ['Organizations'],
  })
  .input(
    type({
      body: CreateOrganizationInviteRequest,
      params: OrganizationIdPath,
    }),
  )
  .output(OrganizationInvite)
