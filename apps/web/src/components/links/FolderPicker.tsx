import { useId, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Drawer, DrawerHeader } from '@astryxdesign/core/Drawer'
import { Field } from '@astryxdesign/core/Field'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { TreeList } from '@astryxdesign/core/TreeList'
import type { TreeListItemData } from '@astryxdesign/core/TreeList'
import { VStack } from '@astryxdesign/core/VStack'
import { FolderIcon, PlusIcon } from '#/components/icons/IcnMcp'
import FolderNameDialog from '#/components/links/FolderNameDialog'
import { FLOATING_END_DRAWER_PADDING, floatingEndDrawerStyle } from '#/components/members/floating-end-drawer'
import type { LinkFolder } from '#/lib/api/types'
import { canCreateFolderIn, folderPathLabel, getChildFolders, getFolderPath } from '#/lib/links/folder-tree'

const ROOT_ID = '__root__'
const ROOT_LABEL = 'All links'

type FolderPickerProps = {
  label?: string
  folders: LinkFolder[]
  /** Null is the top level. */
  value: string | null
  onChange: (folderId: string | null) => void
  width?: string | number
  /**
   * Creates a folder inside `parentId` (null = top level). With it, the sheet
   * offers "New folder". Rejects with an Error carrying a message to show.
   */
  onCreateFolder?: (name: string, parentId: string | null) => Promise<LinkFolder>
}

/**
 * A folder field that opens a sheet with the folder tree, so deeply nested
 * folders stay readable. Clicking a folder highlights it; "Use folder"
 * confirms it. Searching shows matches with their full path. "New folder"
 * creates one inside the highlighted folder and highlights it.
 */
export default function FolderPicker({ label = 'Folder', folders, value, onChange, width = '100%', onCreateFolder }: FolderPickerProps) {
  const inputID = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [query, setQuery] = useState('')
  /** The folder highlighted in the sheet; it only becomes the value on confirm. */
  const [pending, setPending] = useState<string | null>(value)
  const pendingLabel = pending ? folderPathLabel(folders, pending) : ROOT_LABEL

  const open = () => {
    setQuery('')
    setPending(value)
    setIsOpen(true)
  }

  const confirm = () => {
    onChange(pending)
    setIsOpen(false)
  }

  // Everything on the way to the current (or just highlighted) folder starts open, so it is in view.
  const openIds = useMemo(
    () => new Set([...getFolderPath(folders, value), ...getFolderPath(folders, pending)].map((f) => f.id)),
    [folders, value, pending],
  )

  const tree = useMemo<TreeListItemData[]>(() => {
    const branch = (parentId: string | null): TreeListItemData[] =>
      getChildFolders(folders, parentId).map((folder) => {
        const children = branch(folder.id)
        return {
          id: folder.id,
          label: folder.name,
          startContent: <FolderIcon size={16} />,
          isSelected: folder.id === pending,
          ...(children.length > 0 ? { children, isExpanded: openIds.has(folder.id) } : {}),
          onClick: () => setPending(folder.id),
        }
      })
    // "All links" is the root of the tree, so every folder visibly sits inside it.
    const topLevel = branch(null)
    return [
      {
        id: ROOT_ID,
        label: ROOT_LABEL,
        startContent: <FolderIcon size={16} />,
        isSelected: pending === null,
        onClick: () => setPending(null),
        ...(topLevel.length > 0 ? { children: topLevel, isExpanded: true } : {}),
      },
    ]
  }, [folders, pending, openIds])

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
          onClick={open}
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
              <VStack gap={3} hAlign="stretch" width="100%">
                {folders.length > 0 ? (
                  <TextInput
                    label="Search folders"
                    isLabelHidden
                    placeholder="Search folders"
                    size="sm"
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
                      density="compact"
                      items={matches.map(({ folder, path }) => ({
                        id: folder.id,
                        label: folder.name,
                        description: path,
                        startContent: <FolderIcon size={16} />,
                        isSelected: folder.id === pending,
                        onClick: () => setPending(folder.id),
                      }))}
                    />
                  ) : (
                    <Text type="supporting" color="secondary">
                      No folder matches “{query.trim()}”.
                    </Text>
                  )
                ) : (
                  <TreeList aria-label="Folders" density="compact" items={tree} />
                )}
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider>
              <HStack gap={2} hAlign={onCreateFolder ? 'between' : 'end'} vAlign="center" width="100%">
                {onCreateFolder ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    label="New folder"
                    icon={<PlusIcon size={14} style={{ display: 'flex' }} />}
                    isDisabled={!canCreateFolderIn(folders, pending)}
                    tooltip={canCreateFolderIn(folders, pending) ? `Create a folder in ${pendingLabel}` : 'Folders cannot be nested any deeper.'}
                    onClick={() => setIsCreating(true)}
                  />
                ) : null}
                <HStack gap={2} hAlign="end">
                  <Button variant="ghost" size="sm" label="Cancel" onClick={() => setIsOpen(false)} />
                  <Button
                    variant="primary"
                    size="sm"
                    label="Use folder"
                    isDisabled={pending === value}
                    onClick={confirm}
                  />
                </HStack>
              </HStack>
            </LayoutFooter>
          }
        />
      </Drawer>

      {onCreateFolder ? (
        <FolderNameDialog
          isOpen={isCreating}
          onOpenChange={setIsCreating}
          title="New folder"
          subtitle={`Inside ${pendingLabel}`}
          submitLabel="Create folder"
          onSubmit={async (name) => {
            const created = await onCreateFolder(name, pending)
            // The new folder is highlighted, ready to confirm.
            setQuery('')
            setPending(created.id)
          }}
        />
      ) : null}
    </>
  )
}
