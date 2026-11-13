import type { DropdownMenuOption } from '@astryxdesign/core/DropdownMenu'
import type { LinkFolder, ShortLink } from '#/data/demo/types'

/** Drag payload for moving a folder (`folder:<id>`) or link (`link:<id>`). */
export const DRAG_MIME = 'application/x-openlink-item'

export type ItemMenus = {
  folderMenu: (folder: LinkFolder) => DropdownMenuOption[]
  linkMenu: (link: ShortLink) => DropdownMenuOption[]
}
