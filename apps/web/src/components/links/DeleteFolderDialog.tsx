import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog'
import { HStack } from '@astryxdesign/core/HStack'
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { FOLDER_DIALOG_PADDING } from '#/components/links/dialog-spacing'
import type { LinkFolder } from '#/data/demo/types'
import type { DeleteFolderMode } from '#/lib/links/folder-tree'

type DeleteFolderDialogProps = {
  folder: LinkFolder | null
  contents: { folders: number; links: number }
  /** Name of the folder contents move into ("All links" at the root). */
  parentLabel: string
  onOpenChange: (open: boolean) => void
  onConfirm: (folderId: string, mode: DeleteFolderMode) => void
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

export default function DeleteFolderDialog({
  folder,
  contents,
  parentLabel,
  onOpenChange,
  onConfirm,
}: DeleteFolderDialogProps) {
  const [mode, setMode] = useState<DeleteFolderMode>('move-up')
  const isEmpty = contents.folders === 0 && contents.links === 0

  useEffect(() => {
    if (folder) setMode('move-up')
  }, [folder])

  const summary = `${plural(contents.links, 'link', 'links')} and ${plural(
    contents.folders,
    'subfolder',
    'subfolders',
  )}`

  return (
    <Dialog
      isOpen={folder != null}
      onOpenChange={onOpenChange}
      purpose="required"
      width={460}
      padding={FOLDER_DIALOG_PADDING}
    >
      <Layout
        header={
          <DialogHeader
            title={`Delete “${folder?.name ?? ''}”?`}
            onOpenChange={onOpenChange}
          />
        }
        content={
          <LayoutContent padding={FOLDER_DIALOG_PADDING}>
            <VStack gap={4} hAlign="stretch" width="100%">
              {isEmpty ? (
                <Text type="supporting" color="secondary">
                  This folder is empty.
                </Text>
              ) : (
                <>
                  <Text type="supporting" color="secondary">
                    This folder contains {summary}.
                  </Text>
                  <SegmentedControl
                    label="What happens to the contents"
                    value={mode}
                    onChange={(value) => setMode(value as DeleteFolderMode)}
                    layout="fill"
                  >
                    <SegmentedControlItem value="move-up" label="Keep contents" />
                    <SegmentedControlItem
                      value="cascade"
                      label="Delete contents"
                    />
                  </SegmentedControl>
                  <Text type="supporting" color="secondary">
                    {mode === 'move-up'
                      ? `Links and subfolders move up to “${parentLabel}”.`
                      : 'Everything inside is permanently deleted, including the links and their short URLs.'}
                  </Text>
                </>
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
                variant={mode === 'cascade' ? 'destructive' : 'primary'}
                label={
                  mode === 'cascade' && !isEmpty
                    ? 'Delete everything'
                    : 'Delete folder'
                }
                onClick={() => {
                  if (folder) onConfirm(folder.id, isEmpty ? 'move-up' : mode)
                  onOpenChange(false)
                }}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}
