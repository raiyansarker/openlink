import { useState } from 'react'
import type { MoveSubject } from '#/components/links/MoveToFolderDialog'
import type { LinkFolder, ShortLink } from '#/lib/api/types'

/** Which dialog of the Links page is open, and for what. */
export function useLinksBrowserDialogs() {
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [renaming, setRenaming] = useState<LinkFolder | null>(null)
  const [moving, setMoving] = useState<MoveSubject | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<LinkFolder | null>(null)
  const [deletingLink, setDeletingLink] = useState<ShortLink | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  return {
    newFolderOpen,
    setNewFolderOpen,
    renaming,
    setRenaming,
    moving,
    setMoving,
    deletingFolder,
    setDeletingFolder,
    deletingLink,
    setDeletingLink,
    isImportOpen,
    setIsImportOpen,
  }
}

export type LinksBrowserDialogState = ReturnType<typeof useLinksBrowserDialogs>
