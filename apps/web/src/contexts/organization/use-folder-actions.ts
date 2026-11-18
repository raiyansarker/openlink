import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { DeleteFolderMode, LinkFolder } from '#/lib/api/types'
import { orpc } from '#/lib/api/orpc'
import { canCreateFolderIn, canMoveFolder, validateFolderName } from '#/lib/links/folder-tree'

type FolderActionsInput = {
  orgId: string
  folders: LinkFolder[]
  requireFolder: (folderId: string | null, message?: string) => void
  /** Folder changes can move or delete links, so this refreshes both lists. */
  refreshFolders: () => unknown
}

/** Everything that creates, renames, moves or deletes folders. Each rejects with an Error when it can't proceed. */
export function useFolderActions({ orgId, folders, requireFolder, refreshFolders }: FolderActionsInput) {
  const createFolderMutation = useMutation(orpc.folders.createFolder.mutationOptions({ onSuccess: refreshFolders }))
  const updateFolderMutation = useMutation(orpc.folders.updateFolder.mutationOptions({ onSuccess: refreshFolders }))
  const deleteFolderMutation = useMutation(orpc.folders.deleteFolder.mutationOptions({ onSuccess: refreshFolders }))

  const createFolder = useCallback(
    async (name: string, parentId: string | null) => {
      requireFolder(parentId)
      if (!canCreateFolderIn(folders, parentId)) throw new Error('Folders cannot be nested any deeper.')
      const error = validateFolderName(folders, name, parentId)
      if (error) throw new Error(error)
      return createFolderMutation.mutateAsync({ params: { organizationId: orgId }, body: { name: name.trim(), parentId } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folders, orgId, requireFolder],
  )

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      const target = folders.find((f) => f.id === folderId)
      if (!target) throw new Error('That folder no longer exists.')
      const error = validateFolderName(folders, name, target.parentId ?? null, folderId)
      if (error) throw new Error(error)
      await updateFolderMutation.mutateAsync({ params: { organizationId: orgId, folderId }, body: { name: name.trim() } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folders, orgId],
  )

  const moveFolder = useCallback(
    async (folderId: string, parentId: string | null) => {
      const target = folders.find((f) => f.id === folderId)
      if (!target) throw new Error('That folder no longer exists.')
      if ((target.parentId ?? null) === parentId) return
      requireFolder(parentId, 'That destination no longer exists.')
      if (!canMoveFolder(folders, folderId, parentId)) {
        throw new Error('A folder cannot be moved into itself, its subfolders, or past the maximum depth.')
      }
      const error = validateFolderName(folders, target.name, parentId, folderId)
      if (error) throw new Error(error)
      await updateFolderMutation.mutateAsync({ params: { organizationId: orgId, folderId }, body: { parentId } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folders, orgId, requireFolder],
  )

  const deleteFolder = useCallback(
    async (folderId: string, mode: DeleteFolderMode) => {
      // The server moves or deletes the contents; the mutation reloads both lists.
      await deleteFolderMutation.mutateAsync({ params: { organizationId: orgId, folderId }, query: { mode } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  )

  return { createFolder, renameFolder, moveFolder, deleteFolder }
}
