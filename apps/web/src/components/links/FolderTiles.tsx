import { useState, type DragEvent } from 'react'
import type { DropdownMenuOption } from '@astryxdesign/core/DropdownMenu'
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
import { usePermissions } from '#/hooks/use-permissions'
import {
  FOLDER_BLUE,
  FOLDER_CHIP_BG,
  FOLDER_CHIP_BORDER,
} from '#/components/links/folder-colors'
import type { LinkFolder } from '#/lib/api/types'

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
  // Dragging moves a folder; viewers can open and select tiles, but not drag them.
  const { canManageLinks } = usePermissions()

  return (
    <Grid columns={{ minWidth: 240, repeat: 'fill' }} gap={3}>
      {tiles.map(({ folder }) => {
        const menu = folderMenu(folder)
        const tile = (
          <FolderTile
            key={folder.id}
            folder={folder}
            isSelected={selectedId === folder.id}
            canDrag={canManageLinks}
            hasMenu={menu.length > 1}
            menu={menu}
            onSelect={onSelect}
            onOpenFolder={onOpenFolder}
            onDropItem={onDropItem}
          />
        )
        // A lone "Open" item repeats the card's own click: no menu to open.
        return menu.length > 1 ? (
          <ContextMenu
            key={folder.id}
            label={`Actions for ${folder.name}`}
            items={menu}
            menuWidth={200}
          >
            {tile}
          </ContextMenu>
        ) : (
          tile
        )
      })}
    </Grid>
  )
}

/** One folder tile: its drop highlight, its drag, and its menu button. */
function FolderTile({
  folder,
  isSelected,
  canDrag,
  hasMenu,
  menu,
  onSelect,
  onOpenFolder,
  onDropItem,
}: {
  folder: LinkFolder
  isSelected: boolean
  canDrag: boolean
  hasMenu: boolean
  menu: DropdownMenuOption[]
  onSelect: (folderId: string | null) => void
  onOpenFolder: (folderId: string) => void
  onDropItem: (itemKey: string, destinationId: string | null) => void
}) {
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const highlighted = dropTargetId === folder.id || isSelected

  const select = () => onSelect(folder.id)

  return (
    <ClickableCard
      label={`${folder.name}, folder`}
      padding={3}
      draggable={canDrag}
      onDragStart={(e: DragEvent) => {
        if (!canDrag) return
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
      onClick={(e) => (e.detail === 0 ? onOpenFolder(folder.id) : select())}
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
        {hasMenu ? <ItemMenuButton label={folder.name} items={menu} /> : null}
      </HStack>
    </ClickableCard>
  )
}
