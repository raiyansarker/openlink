import { useState, type DragEvent } from 'react'
import { ClickableCard } from '@astryxdesign/core/ClickableCard'
import { ContextMenu } from '@astryxdesign/core/ContextMenu'
import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { FolderIcon } from '#/components/icons/IcnMcp'
import ItemMenuButton from '#/components/links/ItemMenuButton'
import {
  DRAG_MIME,
  type ItemMenus,
} from '#/components/links/links-browser-types'
import {
  FOLDER_BLUE,
  FOLDER_CHIP_BG,
  FOLDER_CHIP_BORDER,
} from '#/components/links/folder-colors'
import type { LinkFolder } from '#/data/demo/types'

export type FolderTile = { folder: LinkFolder }

type FolderTilesProps = Pick<ItemMenus, 'folderMenu'> & {
  tiles: FolderTile[]
  selectedId: string | null
  onSelect: (folderId: string | null) => void
  onOpenFolder: (folderId: string) => void
  onDropItem: (itemKey: string, destinationId: string | null) => void
}

const HIGHLIGHT = `2px solid ${FOLDER_BLUE}`

/**
 * Drive-style folder chips: a compact row on a soft Dropbox-blue fill,
 * the name, and a menu. Click selects; double click / Enter opens.
 */
export default function FolderTiles({
  tiles,
  selectedId,
  onSelect,
  onOpenFolder,
  onDropItem,
  folderMenu,
}: FolderTilesProps) {
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  return (
    <Grid columns={{ minWidth: 240, repeat: 'fill' }} gap={3}>
      {tiles.map(({ folder }) => {
        const highlighted =
          dropTargetId === folder.id || selectedId === folder.id
        return (
          <ContextMenu
            key={folder.id}
            label={`Actions for ${folder.name}`}
            items={folderMenu(folder)}
            menuWidth={200}
          >
            <ClickableCard
              label={`${folder.name}, folder`}
              padding={3}
              draggable
              onDragStart={(e: DragEvent) => {
                e.dataTransfer.setData(DRAG_MIME, `folder:${folder.id}`)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragOver={(e: DragEvent) => {
                if (e.dataTransfer.types.includes(DRAG_MIME)) {
                  e.preventDefault()
                  setDropTargetId(folder.id)
                }
              }}
              onDragLeave={() => setDropTargetId(null)}
              onDrop={(e: DragEvent) => {
                e.preventDefault()
                setDropTargetId(null)
                const dragged = e.dataTransfer.getData(DRAG_MIME)
                if (dragged) onDropItem(dragged, folder.id)
              }}
              // detail === 0 is keyboard activation: open instead of select.
              onClick={(e) =>
                e.detail === 0 ? onOpenFolder(folder.id) : onSelect(folder.id)
              }
              onDoubleClick={() => onOpenFolder(folder.id)}
              style={{
                backgroundColor: FOLDER_CHIP_BG,
                border: FOLDER_CHIP_BORDER,
                outline: highlighted ? HIGHLIGHT : undefined,
                outlineOffset: -2,
              }}
            >
              <HStack gap={3} vAlign="center" width="100%">
                <span
                  style={{
                    display: 'flex',
                    flexShrink: 0,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <FolderIcon size={22} strokeWidth={1.25} />
                </span>
                <Text weight="medium" maxLines={1} style={{ flex: 1, minWidth: 0 }}>
                  {folder.name}
                </Text>
                <ItemMenuButton label={folder.name} items={folderMenu(folder)} />
              </HStack>
            </ClickableCard>
          </ContextMenu>
        )
      })}
    </Grid>
  )
}
