import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import {
  CreateLinkRequest,
  DomainIdPath,
  Link,
  LinkIdPath,
  ListLinksResponse,
  UpdateLinkRequest,
} from './schema'

export const listLinks = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'listLinks',
      path: '/organizations/{organizationId}/domains/{domainId}/links',
      inputStructure: 'detailed',
      tags: ['Links'],
    }),
  )
  .input(type({ params: DomainIdPath }))
  .output(ListLinksResponse)

export const createLink = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'createLink',
      path: '/organizations/{organizationId}/domains/{domainId}/links',
      successStatus: 201,
      inputStructure: 'detailed',
      tags: ['Links'],
    }),
  )
  .input(type({ body: CreateLinkRequest, params: DomainIdPath }))
  .output(Link)

export const deleteLink = oc
  .meta(
    openapi({
      method: 'DELETE',
      operationId: 'deleteLink',
      path: '/organizations/{organizationId}/domains/{domainId}/links/{linkId}',
      successStatus: 204,
      inputStructure: 'detailed',
      tags: ['Links'],
    }),
  )
  .input(type({ params: LinkIdPath }))
  .output(EmptyResponse)

export const getLink = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'getLink',
      path: '/organizations/{organizationId}/domains/{domainId}/links/{linkId}',
      inputStructure: 'detailed',
      tags: ['Links'],
    }),
  )
  .input(type({ params: LinkIdPath }))
  .output(Link)

export const updateLink = oc
  .meta(
    openapi({
      method: 'PATCH',
      operationId: 'updateLink',
      path: '/organizations/{organizationId}/domains/{domainId}/links/{linkId}',
      inputStructure: 'detailed',
      tags: ['Links'],
    }),
  )
  .input(type({ body: UpdateLinkRequest, params: LinkIdPath }))
  .output(Link)

export const contract = {
  listLinks,
  createLink,
  deleteLink,
  getLink,
  updateLink,
} as const
