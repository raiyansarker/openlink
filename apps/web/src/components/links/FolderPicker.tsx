import { useId, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { Field } from '@astryxdesign/core/Field'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { TreeList } from '@astryxdesign/core/TreeList'
import type { TreeListItemData } from '@astryxdesign/core/TreeList'
import { VStack } from '@astryxdesign/core/VStack'
import { FolderIcon } from '#/components/icons/IcnMcp'
import { FLOATING_END_DRAWER_PADDING, floatingEndDrawerStyle } from '#/components/members/floating-end-drawer'
import type { LinkFolder } from '#/lib/api/types'
import { folderPathLabel, getChildFolders, getFolderPath } from '#/lib/links/folder-tree'

const ROOT_ID = '__root__'
const ROOT_LABEL = 'All links (top level)'

type FolderPickerProps = {
  label?: string
  folders: LinkFolder[]
  /** Null is the top level. */
  value: string | null
  onChange: (folderId: string | null) => void
  width?: string | number
}

/**
 * A folder field that opens a sheet with the folder tree, so deeply nested
 * folders stay readable. Searching shows matches with their full path.
 */
export default function FolderPicker({ label = 'Folder', folders, value, onChange, width = '100%' }: FolderPickerProps) {
  const inputID = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const choose = (folderId: string | null) => {
    onChange(folderId)
    setIsOpen(false)
  }

  // Everything on the way to the chosen folder starts open, so it is in view.
  const openIds = useMemo(() => new Set(getFolderPath(folders, value).map((f) => f.id)), [folders, value])

  const tree = useMemo<TreeListItemData[]>(() => {
    const branch = (parentId: string | null): TreeListItemData[] =>
      getChildFolders(folders, parentId).map((folder) => {
        const children = branch(folder.id)
        return {
          id: folder.id,
          label: folder.name,
          startContent: <FolderIcon size={16} />,
          isSelected: folder.id === value,
          ...(children.length > 0 ? { children, isExpanded: openIds.has(folder.id) } : {}),
          onClick: () => choose(folder.id),
        }
      })
    return [
      {
        id: ROOT_ID,
        label: ROOT_LABEL,
        startContent: <FolderIcon size={16} />,
        isSelected: value === null,
        onClick: () => choose(null),
      },
      ...branch(null),
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders, value, openIds])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return folders
      .filter((folder) => folder.name.toLowerCase().includes(q))
      .map((folder) => ({ folder, path: folderPathLabel(folders, folder.id) }))
      .sort((a, b) => a.path.localeCompare(b.path))
  }, [folders, query])

  return (
    <>
      <Field label={label} inputID={inputID} width={width}>
        <Button
          id={inputID}
          variant="secondary"
          label={value ? folderPathLabel(folders, value) : ROOT_LABEL}
          width="100%"
          onClick={() => {
            setQuery('')
            setIsOpen(true)
          }}
        >
          <HStack gap={2} vAlign="center" hAlign="between" width="100%">
            <HStack gap={2} vAlign="center" style={{ minWidth: 0 }}>
              <FolderIcon size={16} />
              <Text maxLines={1}>{value ? folderPathLabel(folders, value) : ROOT_LABEL}</Text>
            </HStack>
            <Icon icon="chevronRight" size="sm" color="secondary" />
          </HStack>
        </Button>
      </Field>

      <Drawer
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        label="Choose a folder"
        side="end"
        width={400}
        purpose="form"
        padding={FLOATING_END_DRAWER_PADDING}
        style={floatingEndDrawerStyle()}
      >
        <Layout
          header={<DrawerHeader title="Choose a folder" subtitle="Where the link is filed." onOpenChange={setIsOpen} />}
          content={
            <LayoutContent>
              <VStack gap={4} hAlign="stretch" width="100%">
                {folders.length > 0 ? (
                  <TextInput
                    label="Search folders"
                    isLabelHidden
                    placeholder="Search folders"
                    value={query}
                    onChange={setQuery}
                    hasClear
                    width="100%"
                  />
                ) : null}
                {matches ? (
                  matches.length > 0 ? (
                    <TreeList
                      aria-label="Matching folders"
                      variant="noGuides"
                      items={matches.map(({ folder, path }) => ({
                        id: folder.id,
                        label: folder.name,
                        description: path,
                        startContent: <FolderIcon size={16} />,
                        isSelected: folder.id === value,
                        onClick: () => choose(folder.id),
                      }))}
                    />
                  ) : (
                    <Text type="supporting" color="secondary">
                      No folder matches “{query.trim()}”.
                    </Text>
                  )
                ) : (
                  <TreeList aria-label="Folders" items={tree} />
                )}
              </VStack>
            </LayoutContent>
          }
        />
      </Drawer>
    </>
  )
}
