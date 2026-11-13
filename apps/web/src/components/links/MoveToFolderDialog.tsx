import { useEffect, useMemo, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { FOLDER_DIALOG_PADDING } from '#/components/links/dialog-spacing'
import type { LinkFolder } from '#/data/demo/types'
import { canMoveFolder, folderPathLabel } from '#/lib/links/folder-tree'

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
  onMove: (subject: MoveSubject, destinationId: string | null) => void
}

export default function MoveToFolderDialog({
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
  const [selected, setSelected] = useState(currentId ?? ROOT_VALUE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (subject) {
      setSelected(currentId ?? ROOT_VALUE)
      setError(null)
    }
  }, [subject, currentId])

  const options = useMemo(() => {
    const rows = folders
      .map((f) => ({ folder: f, label: folderPathLabel(folders, f.id) }))
      .sort((a, b) => a.label.localeCompare(b.label))
    return [
      { value: ROOT_VALUE, label: 'All links (top level)' },
      ...rows.map(({ folder, label }) => ({
        value: folder.id,
        label,
        disabled:
          subject?.kind === 'folder' &&
          !canMoveFolder(folders, subject.id, folder.id),
      })),
    ]
  }, [folders, subject])

  const unchanged = selected === (currentId ?? ROOT_VALUE)

  const submit = () => {
    if (!subject) return
    if (unchanged) {
      onOpenChange(false)
      return
    }
    try {
      onMove(subject, selected === ROOT_VALUE ? null : selected)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <Dialog
      isOpen={subject != null}
      onOpenChange={onOpenChange}
      purpose="form"
      width={460}
      padding={FOLDER_DIALOG_PADDING}
    >
      <Layout
        header={<DialogHeader title="Move to…" onOpenChange={onOpenChange} />}
        content={
          <LayoutContent padding={FOLDER_DIALOG_PADDING}>
            <VStack gap={4} hAlign="stretch" width="100%">
              <Text type="supporting" color="secondary">
                Choose a destination for “{subject?.name}”.
              </Text>
              <Selector
                label="Destination folder"
                options={options}
                value={selected}
                onChange={(value) => {
                  setSelected(value)
                  setError(null)
                }}
                status={error ? { type: 'error', message: error } : undefined}
                width="100%"
              />
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
                label={unchanged ? 'Done' : 'Move here'}
                onClick={submit}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
