import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import DeleteFolderDialog from '#/components/links/DeleteFolderDialog'
import FolderNameDialog from '#/components/links/FolderNameDialog'
import ImportLinksDialog from '#/components/links/ImportLinksDialog'
import MoveToFolderDialog from '#/components/links/MoveToFolderDialog'
import type { LinksBrowserDialogState } from '#/components/links/use-links-browser-dialogs'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { LinkFolder } from '#/lib/api/types'
import { countFolderContents, folderPathLabel } from '#/lib/links/folder-tree'

type LinksBrowserDialogsProps = {
  dialogs: LinksBrowserDialogState
  /** The folder being viewed (null at the top level). */
  currentId: string | null
  /** Folders from the top down to the one being viewed. */
  path: LinkFolder[]
  onOpenFolder: (folderId: string | null) => void
  /** Runs an action and shows its failure above the list. */
  run: (action: () => Promise<unknown>) => void
}

/** Every dialog on the Links page, driven by `useLinksBrowserDialogs`. */
export default function LinksBrowserDialogs({
  dialogs,
  currentId,
  path,
  onOpenFolder,
  run,
}: LinksBrowserDialogsProps) {
  const {
    links,
    folders,
    domains,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    moveLink,
    deleteLink,
    createLink,
    moveLinks,
  } = useOrganization()
  const {
    newFolderOpen,
    setNewFolderOpen,
    renaming,
    setRenaming,
    moving,
    setMoving,
    deletingFolder,
    setDeletingFolder,
    deletingLink,
    setDeletingLink,
    isImportOpen,
    setIsImportOpen,
  } = dialogs

  const deletingContents = deletingFolder
    ? countFolderContents(folders, links, deletingFolder.id)
    : { folders: 0, links: 0 }

  return (
    <>
      <FolderNameDialog
        isOpen={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        title="New folder"
        subtitle={`Inside ${folderPathLabel(folders, currentId)}`}
        submitLabel="Create folder"
        onSubmit={async (name) => {
          await createFolder(name, currentId)
        }}
      />
      <FolderNameDialog
        isOpen={renaming != null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null)
        }}
        title="Rename folder"
        submitLabel="Save name"
        initialName={renaming?.name}
        onSubmit={(name) => {
          if (renaming) return renameFolder(renaming.id, name)
        }}
      />
      <MoveToFolderDialog
        subject={moving}
        folders={folders}
        onOpenChange={(open) => {
          if (!open) setMoving(null)
        }}
        onMove={(subject, destinationId) => {
          if (subject.kind === 'folder') return moveFolder(subject.id, destinationId)
          if (subject.kind === 'links') return moveLinks(subject.ids, destinationId)
          return moveLink(subject.id, destinationId)
        }}
      />
      <DeleteFolderDialog
        folder={deletingFolder}
        contents={deletingContents}
        parentLabel={folderPathLabel(folders, deletingFolder?.parentId ?? null)}
        onOpenChange={(open) => {
          if (!open) setDeletingFolder(null)
        }}
        onConfirm={(id, mode) => {
          const wasInside = path.some((f) => f.id === id)
          const parentId = deletingFolder?.parentId ?? null
          run(async () => {
            await deleteFolder(id, mode)
            // Leave a folder that no longer exists (or moved its contents up).
            if (wasInside) onOpenFolder(parentId)
          })
        }}
      />
      <ImportLinksDialog
        isOpen={isImportOpen}
        onOpenChange={setIsImportOpen}
        links={links}
        folders={folders}
        defaultFolderId={currentId}
        domains={domains.filter((d) => d.readiness === 'active')}
        onCreate={async (draft) => {
          await createLink(draft)
        }}
      />
      <AlertDialog
        isOpen={deletingLink != null}
        onOpenChange={(open) => {
          if (!open) setDeletingLink(null)
        }}
        title={`Delete ${deletingLink?.title ?? 'link'}?`}
        description="The short URL stops working immediately. This cannot be undone."
        actionLabel="Delete link"
        actionVariant="destructive"
        onAction={() => {
          if (deletingLink) {
            const id = deletingLink.id
            run(() => deleteLink(id))
          }
          setDeletingLink(null)
        }}
      />
    </>
  )
}
