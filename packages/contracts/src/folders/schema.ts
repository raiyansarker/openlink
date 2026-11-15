import { type } from 'arktype'

import { OrganizationIdPath } from '../organizations/schema'

export const LinkFolder = type({
  id: 'string',
  organizationId: 'string',
  /** Null or absent means the workspace root. */
  'parentId?': 'string | null',
  name: 'string',
  createdAt: 'string',
})

export const ListFoldersResponse = type({ items: LinkFolder.array() })

export const CreateFolderRequest = type({
  name: 'string',
  'parentId?': 'string | null',
})

export const UpdateFolderRequest = type({
  'name?': 'string',
  /** Move the folder; null moves it to the root. */
  'parentId?': 'string | null',
})

export const FolderIdPath = type({
  organizationId: 'string',
  folderId: 'string',
})

/** `move-up` re-parents contents to the parent folder; `cascade` deletes the subtree and its links. */
export const DeleteFolderMode = type("'move-up' | 'cascade'")

export const DeleteFolderQuery = type({ 'mode?': DeleteFolderMode })

export { OrganizationIdPath }
