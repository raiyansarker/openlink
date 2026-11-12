import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import {
  AddDomainRequest,
  CustomDomain,
  DomainIdPath,
  ListDomainsResponse,
  OrganizationIdPath,
} from './schema'

export const listDomains = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'listDomains',
      path: '/organizations/{organizationId}/domains',
      inputStructure: 'detailed',
      tags: ['Domains'],
    }),
  )
  .input(type({ params: OrganizationIdPath }))
  .output(ListDomainsResponse)

export const addDomain = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'addDomain',
      path: '/organizations/{organizationId}/domains',
      successStatus: 201,
      inputStructure: 'detailed',
      tags: ['Domains'],
    }),
  )
  .input(type({ body: AddDomainRequest, params: OrganizationIdPath }))
  .output(CustomDomain)

export const removeDomain = oc
  .meta(
    openapi({
      method: 'DELETE',
      operationId: 'removeDomain',
      path: '/organizations/{organizationId}/domains/{domainId}',
      successStatus: 204,
      inputStructure: 'detailed',
      tags: ['Domains'],
    }),
  )
  .input(type({ params: DomainIdPath }))
  .output(EmptyResponse)

export const getDomain = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'getDomain',
      path: '/organizations/{organizationId}/domains/{domainId}',
      inputStructure: 'detailed',
      tags: ['Domains'],
    }),
  )
  .input(type({ params: DomainIdPath }))
  .output(CustomDomain)

export const refreshDomainStatus = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'refreshDomainStatus',
      path: '/organizations/{organizationId}/domains/{domainId}/refresh',
      summary: 'Poll provider state via Domain SDK',
      inputStructure: 'detailed',
      tags: ['Domains'],
    }),
  )
  .input(type({ params: DomainIdPath }))
  .output(CustomDomain)

export const contract = {
  listDomains,
  addDomain,
  removeDomain,
  getDomain,
  refreshDomainStatus,
} as const
