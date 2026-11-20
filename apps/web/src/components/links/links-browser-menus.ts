import type { DropdownMenuOption } from '@astryxdesign/core/DropdownMenu'
import type { LinkFolder, ShortLink } from '#/lib/api/types'
import { isOnHold } from '#/lib/links/create-link'

type FolderMenuActions = {
  onOpen: (folder: LinkFolder) => void
  onRename: (folder: LinkFolder) => void
  onMove: (folder: LinkFolder) => void
  onDelete: (folder: LinkFolder) => void
}

/** The "…" and right-click menu of a folder tile. */
export function folderMenuItems(folder: LinkFolder, actions: FolderMenuActions): DropdownMenuOption[] {
  return [
    { id: 'open', label: 'Open', onClick: () => actions.onOpen(folder) },
    { id: 'rename', label: 'Rename', onClick: () => actions.onRename(folder) },
    { id: 'move', label: 'Move to…', onClick: () => actions.onMove(folder) },
    { type: 'divider' as const },
    {
      id: 'delete',
      label: 'Delete folder',
      variant: 'destructive' as const,
      onClick: () => actions.onDelete(folder),
    },
  ]
}

type LinkMenuActions = {
  onOpen: (link: ShortLink) => void
  onEdit: (link: ShortLink) => void
  onDuplicate: (link: ShortLink) => void
  onSetHold: (link: ShortLink, isOnHold: boolean) => void
  onMove: (link: ShortLink) => void
  onDelete: (link: ShortLink) => void
}

/** The "…" and right-click menu of a link row. */
export function linkMenuItems(link: ShortLink, actions: LinkMenuActions): DropdownMenuOption[] {
  const held = isOnHold(link)
  return [
    { id: 'open', label: 'Open details', onClick: () => actions.onOpen(link) },
    { id: 'edit', label: 'Edit', onClick: () => actions.onEdit(link) },
    { id: 'duplicate', label: 'Duplicate', onClick: () => actions.onDuplicate(link) },
    { type: 'divider' as const },
    {
      id: held ? 'release' : 'hold',
      label: held ? 'Release hold' : 'Put on hold',
      // `isOnHold` tells the caller which way to flip it.
      onClick: () => actions.onSetHold(link, held),
    },
    { id: 'move', label: 'Move to…', onClick: () => actions.onMove(link) },
    { type: 'divider' as const },
    {
      id: 'delete',
      label: 'Delete link',
      variant: 'destructive' as const,
      onClick: () => actions.onDelete(link),
    },
  ]
}
