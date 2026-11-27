import { useMemo, useState, type DragEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Banner } from '@astryxdesign/core/Banner'
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs'
import { Button } from '@astryxdesign/core/Button'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { VStack } from '@astryxdesign/core/VStack'
import DeleteFolderDialog from '#/components/links/DeleteFolderDialog'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import EmptyFolderIllustration from '#/components/links/EmptyFolderIllustration'
import FolderNameDialog from '#/components/links/FolderNameDialog'
import FolderTiles, { type FolderTile } from '#/components/links/FolderTiles'
import ImportLinksDialog from '#/components/links/ImportLinksDialog'
import LinksListView from '#/components/links/LinksListView'
import MoveToFolderDialog, {
  type MoveSubject,
} from '#/components/links/MoveToFolderDialog'
import { ShortcutChip } from '#/components/dashboard/CreateLinkChromeButton'
import { DRAG_MIME } from '#/components/links/links-browser-types'
import { FolderIcon, PlusIcon } from '#/components/icons/IcnMcp'
import { useOrganization } from '#/contexts/OrganizationContext'
import { usePermissions } from '#/hooks/use-permissions'
import { useShortcut } from '#/hooks/use-shortcut'
import type { LinkFolder, ShortLink } from '#/lib/api/types'
import {
  canCreateFolderIn,
  canMoveFolder,
  countFolderContents,
  folderPathLabel,
  getChildFolders,
  getFolderPath,
  getLinksInFolder,
} from '#/lib/links/folder-tree'
import { isOnHold } from '#/lib/links/create-link'
import { linkTitle } from '#/lib/links/link-summary'

type LinksBrowserProps = {
  /** Current folder id from the URL; unknown ids fall back to the root. */
  folderId: string | undefined
  onOpenFolder: (folderId: string | null) => void
}

export default function LinksBrowser({
  folderId,
  onOpenFolder,
}: LinksBrowserProps) {
  const {
    activeOrg,
    links,
    folders,
    domains,
    createFolder,
    renameFolder,
    moveFolder,
    deleteFolder,
    moveLink,
    setLinkHold,
    deleteLink,
    createLink,
    duplicateLink,
    moveLinks,
  } = useOrganization()
  const navigate = useNavigate()
  // Viewers browse and open; every write control below stays hidden for them.
  const { canManageLinks: canEdit } = usePermissions()

  const currentFolder = folders.find((f) => f.id === folderId) ?? null
  const currentId = currentFolder?.id ?? null
  const path = useMemo(
    () => getFolderPath(folders, currentId),
    [folders, currentId],
  )

  // The selection belongs to the folder it was made in; opening another folder drops it.
  const [selection, setSelection] = useState<{ id: string; inFolder: string | null } | null>(null)
  const selectedFolderId = selection?.inFolder === currentId ? selection.id : null
  const setSelectedFolderId = (id: string | null) =>
    setSelection(id == null ? null : { id, inFolder: currentId })
  const [breadcrumbDropKey, setBreadcrumbDropKey] = useState<string | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [renaming, setRenaming] = useState<LinkFolder | null>(null)
  const [moving, setMoving] = useState<MoveSubject | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<LinkFolder | null>(null)
  const [deletingLink, setDeletingLink] = useState<ShortLink | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  /** Runs an action from a menu or drop, showing its failure above the list. */
  const run = (action: () => Promise<unknown>) => {
    setActionError(null)
    action().catch((err: unknown) =>
      setActionError(err instanceof Error ? err.message : 'Something went wrong.'),
    )
  }
  const canCreateFolderHere = canEdit && canCreateFolderIn(folders, currentId)
  // "F" → new folder in the folder being viewed (like "C" for a new link).
  useShortcut('F', () => setNewFolderOpen(true), {
    isEnabled: canCreateFolderHere,
  })

  const openLink = (linkId: string) =>
    void navigate({
      to: '/w/$orgSlug/links/$linkId',
      params: { orgSlug: activeOrg.slug, linkId },
    })
  const editLink = (linkId: string) =>
    void navigate({ to: '/edit/link', search: { org: activeOrg.slug, link: linkId } })

  const folderTiles = useMemo<FolderTile[]>(
    () =>
      getChildFolders(folders, currentId).map((folder) => ({ folder })),
    [folders, currentId],
  )
  const folderLinks = useMemo(
    () =>
      getLinksInFolder(links, currentId).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [links, currentId],
  )

  /** Drag-and-drop move; invalid drops (cycles, same place) are ignored. */
  const dropItem = (itemKey: string, destinationId: string | null) => {
    if (!canEdit) return
    const [kind, id] = itemKey.split(/:(.*)/s)
    if (kind === 'folder') {
      const folder = folders.find((f) => f.id === id)
      if (
        !folder ||
        (folder.parentId ?? null) === destinationId ||
        !canMoveFolder(folders, id, destinationId)
      ) {
        return
      }
      run(() => moveFolder(id, destinationId))
    } else if (kind === 'link') {
      const link = links.find((l) => l.id === id)
      if (!link || (link.folderId ?? null) === destinationId) return
      run(() => moveLink(id, destinationId))
    }
  }

  const folderMenu = (folder: LinkFolder) => [
    { id: 'open', label: 'Open', onClick: () => onOpenFolder(folder.id) },
    ...(canEdit
      ? [
          { id: 'rename', label: 'Rename', onClick: () => setRenaming(folder) },
          {
            id: 'move',
            label: 'Move to…',
            onClick: () =>
              setMoving({
                kind: 'folder',
                id: folder.id,
                name: folder.name,
                parentId: folder.parentId ?? null,
              }),
          },
          { type: 'divider' as const },
          {
            id: 'delete',
            label: 'Delete folder',
            variant: 'destructive' as const,
            onClick: () => setDeletingFolder(folder),
          },
        ]
      : []),
  ]

  const linkMenu = (link: ShortLink) => [
    { id: 'open', label: 'Open details', onClick: () => openLink(link.id) },
    ...(canEdit
      ? [
          { id: 'edit', label: 'Edit', onClick: () => editLink(link.id) },
          {
            id: 'duplicate',
            label: 'Duplicate',
            onClick: () => run(async () => editLink((await duplicateLink(link.id)).id)),
          },
          { type: 'divider' as const },
          isOnHold(link)
            ? {
                id: 'release',
                label: 'Release hold',
                onClick: () => run(() => setLinkHold(link.id, null)),
              }
            : {
                id: 'hold',
                label: 'Put on hold',
                onClick: () =>
                  run(() => setLinkHold(link.id, { page: link.hold?.page ?? 'bad-gateway' })),
              },
          {
            id: 'move',
            label: 'Move to…',
            onClick: () =>
              setMoving({
                kind: 'link',
                id: link.id,
                name: linkTitle(link),
                folderId: link.folderId ?? null,
              }),
          },
          { type: 'divider' as const },
          {
            id: 'delete',
            label: 'Delete link',
            variant: 'destructive' as const,
            onClick: () => setDeletingLink(link),
          },
        ]
      : []),
  ]

  const breadcrumbDrop = (key: string, destinationId: string | null) => ({
    onDragOver: (e: DragEvent) => {
      if (e.dataTransfer.types.includes(DRAG_MIME)) {
        e.preventDefault()
        setBreadcrumbDropKey(key)
      }
    },
    onDragLeave: () => setBreadcrumbDropKey(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setBreadcrumbDropKey(null)
      const dragged = e.dataTransfer.getData(DRAG_MIME)
      if (dragged) dropItem(dragged, destinationId)
    },
    style:
      breadcrumbDropKey === key
        ? { outline: '2px solid var(--color-accent)', borderRadius: 6 }
        : undefined,
  })

  const deletingContents = deletingFolder
    ? countFolderContents(folders, links, deletingFolder.id)
    : { folders: 0, links: 0 }

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      {actionError ? <Banner status="error" title={actionError} /> : null}
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
        <Breadcrumbs label="Folder path">
          <BreadcrumbItem
            startIcon={<FolderIcon size={14} />}
            onClick={path.length > 0 ? () => onOpenFolder(null) : undefined}
            isCurrent={path.length === 0}
            {...breadcrumbDrop('root', null)}
          >
            All links
          </BreadcrumbItem>
          {path.map((folder, index) => (
            <BreadcrumbItem
              key={folder.id}
              onClick={
                index < path.length - 1
                  ? () => onOpenFolder(folder.id)
                  : undefined
              }
              isCurrent={index === path.length - 1}
              {...breadcrumbDrop(folder.id, folder.id)}
            >
              {folder.name}
            </BreadcrumbItem>
          ))}
        </Breadcrumbs>
        <HStack gap={2} vAlign="center">
          {canEdit ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                label="Import CSV"
                onClick={() => setIsImportOpen(true)}
              />
              <Button
                variant="secondary"
                size="sm"
                label="New folder"
                icon={<PlusIcon size={14} />}
                endContent={<ShortcutChip>F</ShortcutChip>}
                aria-keyshortcuts="F"
                isDisabled={!canCreateFolderHere}
                onClick={() => setNewFolderOpen(true)}
              />
            </>
          ) : null}
        </HStack>
      </HStack>

      {folderTiles.length === 0 && folderLinks.length === 0 ? (
        <EmptyState
          title={currentFolder ? 'This folder is empty' : 'No links yet'}
          description={
            !canEdit
              ? 'Links your team adds will appear here.'
              : currentFolder
                ? 'Drag links or folders here, or create a subfolder to keep things tidy.'
                : 'Create a folder to start organizing your links.'
          }
          icon={
            currentFolder ? (
              <EmptyFolderIllustration variant="folder" />
            ) : (
              <EmptyLinksIllustration />
            )
          }
          actions={
            canEdit ? (
              <HStack gap={2}>
                <Button
                  variant="secondary"
                  label="Import CSV"
                  onClick={() => setIsImportOpen(true)}
                />
                <Button
                  variant="primary"
                  label="New folder"
                  icon={<PlusIcon size={14} />}
                  onClick={() => setNewFolderOpen(true)}
                />
              </HStack>
            ) : undefined
          }
        />
      ) : (
        <VStack gap={6} hAlign="stretch" width="100%">
          {folderTiles.length > 0 ? (
            <VStack gap={3} hAlign="stretch" width="100%">
              <Heading level={3}>Folders</Heading>
              <FolderTiles
                tiles={folderTiles}
                selectedId={selectedFolderId}
                onSelect={setSelectedFolderId}
                onOpenFolder={onOpenFolder}
                onDropItem={dropItem}
                folderMenu={folderMenu}
              />
            </VStack>
          ) : null}
          {folderLinks.length > 0 ? (
            <VStack gap={10} hAlign="stretch" width="100%">
              <Heading level={3}>Links</Heading>
              <LinksListView
                key={currentId ?? 'root'}
                links={folderLinks}
                linkMenu={linkMenu}
                onOpenLink={(link) => openLink(link.id)}
              />
            </VStack>
          ) : null}
        </VStack>
      )}

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
    </VStack>
  )
}
