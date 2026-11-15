import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import {
  AddLinkTagsRequest,
  BulkLinksResponse,
  CreateLinkRequest,
  DeleteLinksRequest,
  DomainIdPath,
  Link,
  LinkIdPath,
  ListLinksResponse,
  ListOrganizationLinksQuery,
  ListOrganizationLinksResponse,
  MoveLinksRequest,
  OrganizationIdPath,
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

export const listOrganizationLinks = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'listOrganizationLinks',
      path: '/organizations/{organizationId}/links',
      summary: 'Search links across every domain of a workspace',
      inputStructure: 'detailed',
      tags: ['Links'],
    }),
  )
  .input(type({ params: OrganizationIdPath, query: ListOrganizationLinksQuery }))
  .output(ListOrganizationLinksResponse)

const bulk = (operationId: string, path: `/${string}`, summary: string) =>
  oc.meta(
    openapi({ method: 'POST', operationId, path, summary, inputStructure: 'detailed', tags: ['Links'] }),
  )

export const moveLinks = bulk('moveLinks', '/organizations/{organizationId}/links/move', 'Move links to a folder')
  .input(type({ params: OrganizationIdPath, body: MoveLinksRequest }))
  .output(BulkLinksResponse)

export const addLinkTags = bulk('addLinkTags', '/organizations/{organizationId}/links/tags', 'Add tags to links, keeping existing ones')
  .input(type({ params: OrganizationIdPath, body: AddLinkTagsRequest }))
  .output(BulkLinksResponse)

export const deleteLinks = bulk('deleteLinks', '/organizations/{organizationId}/links/delete', 'Delete several links')
  .input(type({ params: OrganizationIdPath, body: DeleteLinksRequest }))
  .output(BulkLinksResponse)

export const contract = {
  listOrganizationLinks,
  moveLinks,
  addLinkTags,
  deleteLinks,
  listLinks,
  createLink,
  deleteLink,
  getLink,
  updateLink,
} as const
