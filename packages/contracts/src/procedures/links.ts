import { oc } from '@orpc/contract'
import { type } from 'arktype'

import {
  CreateLinkRequest,
  DomainIdPath,
  EmptyResponse,
  Link,
  LinkIdPath,
  ListLinksResponse,
  UpdateLinkRequest,
} from '../models'

export const listLinks = oc
  .route({
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'listLinks',
    path: '/organizations/{organizationId}/domains/{domainId}/links',
    tags: ['Links'],
  })
  .input(type({ params: DomainIdPath }))
  .output(ListLinksResponse)

export const createLink = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'createLink',
    path: '/organizations/{organizationId}/domains/{domainId}/links',
    successStatus: 201,
    tags: ['Links'],
  })
  .input(type({ body: CreateLinkRequest, params: DomainIdPath }))
  .output(Link)

export const deleteLink = oc
  .route({
    inputStructure: 'detailed',
    method: 'DELETE',
    operationId: 'deleteLink',
    path: '/organizations/{organizationId}/domains/{domainId}/links/{linkId}',
    successStatus: 204,
    tags: ['Links'],
  })
  .input(type({ params: LinkIdPath }))
  .output(EmptyResponse)

export const getLink = oc
  .route({
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'getLink',
    path: '/organizations/{organizationId}/domains/{domainId}/links/{linkId}',
    tags: ['Links'],
  })
  .input(type({ params: LinkIdPath }))
  .output(Link)

export const updateLink = oc
  .route({
    inputStructure: 'detailed',
    method: 'PATCH',
    operationId: 'updateLink',
    path: '/organizations/{organizationId}/domains/{domainId}/links/{linkId}',
    tags: ['Links'],
  })
  .input(type({ body: UpdateLinkRequest, params: LinkIdPath }))
  .output(Link)
