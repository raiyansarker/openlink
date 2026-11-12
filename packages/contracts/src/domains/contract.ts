import { oc } from '@orpc/contract'
import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import {
  AddDomainRequest,
  CustomDomain,
  DomainIdPath,
  ListDomainsResponse,
  OrganizationIdPath,
} from './schema'

export const listDomains = oc
  .route({
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'listDomains',
    path: '/organizations/{organizationId}/domains',
    tags: ['Domains'],
  })
  .input(type({ params: OrganizationIdPath }))
  .output(ListDomainsResponse)

export const addDomain = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'addDomain',
    path: '/organizations/{organizationId}/domains',
    successStatus: 201,
    tags: ['Domains'],
  })
  .input(type({ body: AddDomainRequest, params: OrganizationIdPath }))
  .output(CustomDomain)

export const removeDomain = oc
  .route({
    inputStructure: 'detailed',
    method: 'DELETE',
    operationId: 'removeDomain',
    path: '/organizations/{organizationId}/domains/{domainId}',
    successStatus: 204,
    tags: ['Domains'],
  })
  .input(type({ params: DomainIdPath }))
  .output(EmptyResponse)

export const getDomain = oc
  .route({
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'getDomain',
    path: '/organizations/{organizationId}/domains/{domainId}',
    tags: ['Domains'],
  })
  .input(type({ params: DomainIdPath }))
  .output(CustomDomain)

export const refreshDomainStatus = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'refreshDomainStatus',
    path: '/organizations/{organizationId}/domains/{domainId}/refresh',
    summary: 'Poll provider state via Domain SDK',
    tags: ['Domains'],
  })
  .input(type({ params: DomainIdPath }))
  .output(CustomDomain)

export const contract = {
  listDomains,
  addDomain,
  removeDomain,
  getDomain,
  refreshDomainStatus,
} as const
