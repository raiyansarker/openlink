import { useState, type DragEvent } from 'react'
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs'
import { FolderIcon } from '#/components/icons/IcnMcp'
import { DRAG_MIME } from '#/components/links/links-browser-types'
import type { LinkFolder } from '#/lib/api/types'

type FolderBreadcrumbsProps = {
  /** Folders from the top down to the one being viewed; empty at the top level. */
  path: LinkFolder[]
  onOpenFolder: (folderId: string | null) => void
  /** A link or folder was dropped on a crumb. */
  onDropItem: (itemKey: string, destinationId: string | null) => void
}

/** The folder path. Every crumb is a drop target for moving links and folders. */
export default function FolderBreadcrumbs({ path, onOpenFolder, onDropItem }: FolderBreadcrumbsProps) {
  // Kept here so dragging over a crumb redraws only the path, not the whole page.
  const [dropKey, setDropKey] = useState<string | null>(null)

  const drop = (key: string, destinationId: string | null) => ({
    onDragOver: (e: DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_MIME)) {
        e.preventDefault()
        setDropKey(key)
      }
    },
    onDragLeave: () => setDropKey(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setDropKey(null)
      const dragged = e.dataTransfer.getData(DRAG_MIME)
      if (dragged) onDropItem(dragged, destinationId)
    },
    style:
      dropKey === key ? { outline: '2px solid var(--color-accent)', borderRadius: 6 } : undefined,
  })

  return (
    <Breadcrumbs label="Folder path">
      <BreadcrumbItem
        startIcon={<FolderIcon size={14} />}
        onClick={path.length > 0 ? () => onOpenFolder(null) : undefined}
        isCurrent={path.length === 0}
        {...drop('root', null)}
      >
        All links
      </BreadcrumbItem>
      {path.map((folder, index) => (
        <BreadcrumbItem
          key={folder.id}
          onClick={index < path.length - 1 ? () => onOpenFolder(folder.id) : undefined}
          isCurrent={index === path.length - 1}
          {...drop(folder.id, folder.id)}
        >
          {folder.name}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  )
}
