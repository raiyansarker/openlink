import { useMemo, useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { FolderIcon } from '#/components/icons/IcnMcp'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Text } from '@astryxdesign/core/Text'
import { TreeList } from '@astryxdesign/core/TreeList'
import type { TreeListItemData } from '@astryxdesign/core/TreeList'
import { VStack } from '@astryxdesign/core/VStack'
import { FOLDER_DIALOG_PADDING } from '#/components/links/dialog-spacing'
import { useOpenSession } from '#/hooks/use-open-session'
import type { LinkFolder } from '#/lib/api/types'
import { canMoveFolder, folderPathLabel, getChildFolders, getFolderPath } from '#/lib/links/folder-tree'

const ROOT_VALUE = '__root__'

export type MoveSubject =
  | { kind: 'folder'; id: string; name: string; parentId: string | null }
  | { kind: 'link'; id: string; name: string; folderId: string | null }
  /** Several links at once (bulk move); `name` is e.g. "3 links". */
  | { kind: 'links'; ids: string[]; name: string; folderId: string | null }

type MoveToFolderDialogProps = {
  subject: MoveSubject | null
  folders: LinkFolder[]
  onOpenChange: (open: boolean) => void
  /** Throws an Error with a user-facing message when the move is rejected. */
  onMove: (subject: MoveSubject, destinationId: string | null) => void | Promise<void>
}

/** Id of the item being moved, to tell one move from the next. */
function subjectKey(subject: MoveSubject | null): string | null {
  if (!subject) return null
  return subject.kind === 'links' ? subject.ids.join(',') : subject.id
}

export default function MoveToFolderDialog(props: MoveToFolderDialogProps) {
  const session = useOpenSession(props.subject != null, subjectKey(props.subject))
  return (
    <Dialog
      isOpen={props.subject != null}
      onOpenChange={props.onOpenChange}
      purpose="form"
      width={460}
      padding={FOLDER_DIALOG_PADDING}
    >
      <MoveToFolderForm key={session} {...props} />
    </Dialog>
  )
}

function MoveToFolderForm({
  subject,
  folders,
  onOpenChange,
  onMove,
}: MoveToFolderDialogProps) {
  const currentId =
    subject == null
      ? null
      : subject.kind === 'folder'
        ? subject.parentId
        : subject.folderId
  const [selected, setSelected] = useState<string | null>(currentId)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  /** Folder moves cannot land inside themselves or their own subtree. */
  const isSelectable = (folderId: string) =>
    subject?.kind !== 'folder' || canMoveFolder(folders, subject.id, folderId)

  // Everything on the path to the current and selected folder starts open.
  const openIds = useMemo(
    () =>
      new Set(
        [...getFolderPath(folders, currentId), ...getFolderPath(folders, selected)].map(
          (folder) => folder.id,
        ),
      ),
    [folders, currentId, selected],
  )

  const tree = useMemo<TreeListItemData[]>(() => {
    const q = query.trim().toLowerCase()
    const row = (folder: LinkFolder, path: string): TreeListItemData => ({
      id: folder.id,
      label: folder.name,
      ...(q ? { description: path } : {}),
      startContent: <FolderIcon size={16} />,
      isSelected: folder.id === selected,
      isDisabled: !isSelectable(folder.id),
      onClick: () => {
        setSelected(folder.id)
        setError(null)
      },
    })
    const branch = (parentId: string | null, prefix: string): TreeListItemData[] =>
      getChildFolders(folders, parentId)
        .filter((folder) => !q || folder.name.toLowerCase().includes(q))
        .map((folder) => {
          const path = prefix ? `${prefix} / ${folder.name}` : folder.name
          const children = branch(folder.id, path)
          return {
            ...row(folder, path),
            ...(children.length > 0 ? { children, isExpanded: q ? true : openIds.has(folder.id) } : {}),
          }
        })
    const topLevel = branch(null, '')
    return [
      {
        id: ROOT_VALUE,
        label: 'All links (top level)',
        startContent: <FolderIcon size={16} />,
        isSelected: selected === null,
        onClick: () => {
          setSelected(null)
          setError(null)
        },
        ...(topLevel.length > 0 ? { children: topLevel, isExpanded: true } : {}),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isSelectable closes over subject
  }, [folders, selected, query, openIds, subject])

  /** Search shows matches with their full path, like the folder picker. */
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return folders
      .filter((folder) => folder.name.toLowerCase().includes(q))
      .map((folder) => ({ folder, path: folderPathLabel(folders, folder.id) }))
      .sort((a, b) => a.path.localeCompare(b.path))
  }, [folders, query])

  const unchanged = selected === (currentId ?? null)
  const selectedLabel =
    selected === null ? 'All links (top level)' : folderPathLabel(folders, selected)

  const submit = async () => {
    if (!subject) return
    if (unchanged) {
      onOpenChange(false)
      return
    }
    try {
      await onMove(subject, selected)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <Layout
      header={<DialogHeader title="Move to…" onOpenChange={onOpenChange} />}
      content={
        <LayoutContent padding={FOLDER_DIALOG_PADDING}>
          <VStack gap={4} hAlign="stretch" width="100%">
            <Text type="supporting" color="secondary">
              Choose a destination for “{subject?.name}”.
            </Text>
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
            <VStack
              gap={2}
              hAlign="stretch"
              width="100%"
              style={{ maxHeight: 280, overflowY: 'auto' }}
            >
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
                      isSelected: folder.id === selected,
                      isDisabled: !isSelectable(folder.id),
                      onClick: () => {
                        setSelected(folder.id)
                        setError(null)
                      },
                    }))}
                  />
                ) : (
                  <Text type="supporting" color="secondary">
                    No folder matches “{query.trim()}”.
                  </Text>
                )
              ) : (
                <TreeList aria-label="Destination folders" density="compact" items={tree} />
              )}
            </VStack>
            {error ? (
              <Banner status="error" title={error} />
            ) : (
              <Text type="supporting" color="secondary">
                Destination: {selectedLabel}
              </Text>
            )}
          </VStack>
        </LayoutContent>
      }
      footer={
        <LayoutFooter hasDivider padding={FOLDER_DIALOG_PADDING}>
          <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
            <Button
              variant="ghost"
              label="Cancel"
              onClick={() => onOpenChange(false)}
            />
            <Button
              variant="primary"
              label={unchanged ? 'Done' : `Move to ${selectedLabel}`}
              onClick={() => void submit()}
            />
          </HStack>
        </LayoutFooter>
      }
    />
  )
}
