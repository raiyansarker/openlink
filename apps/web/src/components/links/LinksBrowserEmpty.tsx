import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { HStack } from '@astryxdesign/core/HStack'
import EmptyFolderIllustration from '#/components/links/EmptyFolderIllustration'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import { PlusIcon } from '#/components/icons/IcnMcp'

type LinksBrowserEmptyProps = {
  /** True inside a folder, false at the top level. */
  isInFolder: boolean
  onImport: () => void
  onNewFolder: () => void
}

/** Nothing here yet: the top level has no links, or the folder is empty. */
export default function LinksBrowserEmpty({ isInFolder, onImport, onNewFolder }: LinksBrowserEmptyProps) {
  return (
    <EmptyState
      title={isInFolder ? 'This folder is empty' : 'No links yet'}
      description={
        isInFolder
          ? 'Drag links or folders here, or create a subfolder to keep things tidy.'
          : 'Create a folder to start organizing your links.'
      }
      icon={isInFolder ? <EmptyFolderIllustration variant="folder" /> : <EmptyLinksIllustration />}
      actions={
        <HStack gap={2}>
          <Button variant="secondary" label="Import CSV" onClick={onImport} />
          <Button
            variant="primary"
            label="New folder"
            icon={<PlusIcon size={14} />}
            onClick={onNewFolder}
          />
        </HStack>
      }
    />
  )
}
