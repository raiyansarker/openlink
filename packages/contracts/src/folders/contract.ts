import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import {
  CreateFolderRequest,
  DeleteFolderQuery,
  FolderIdPath,
  LinkFolder,
  ListFoldersResponse,
  OrganizationIdPath,
  UpdateFolderRequest,
} from './schema'

const folderOp = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  operationId: string,
  path: `/${string}`,
  extra: { successStatus?: 201 | 204; summary?: string } = {},
) =>
  oc.meta(
    openapi({ method, operationId, path, inputStructure: 'detailed', tags: ['Folders'], ...extra }),
  )

export const listFolders = folderOp('GET', 'listFolders', '/organizations/{organizationId}/folders')
  .input(type({ params: OrganizationIdPath }))
  .output(ListFoldersResponse)

export const createFolder = folderOp('POST', 'createFolder', '/organizations/{organizationId}/folders', {
  successStatus: 201,
})
  .input(type({ body: CreateFolderRequest, params: OrganizationIdPath }))
  .output(LinkFolder)

export const updateFolder = folderOp(
  'PATCH',
  'updateFolder',
  '/organizations/{organizationId}/folders/{folderId}',
  { summary: 'Rename or move a folder' },
)
  .input(type({ body: UpdateFolderRequest, params: FolderIdPath }))
  .output(LinkFolder)

export const deleteFolder = folderOp(
  'DELETE',
  'deleteFolder',
  '/organizations/{organizationId}/folders/{folderId}',
  { successStatus: 204, summary: 'Delete a folder (default mode: move-up)' },
)
  .input(type({ params: FolderIdPath, query: DeleteFolderQuery }))
  .output(EmptyResponse)

export const contract = { listFolders, createFolder, updateFolder, deleteFolder } as const
