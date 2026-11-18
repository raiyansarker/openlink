import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { VStack } from '@astryxdesign/core/VStack'
import FolderBreadcrumbs from '#/components/links/FolderBreadcrumbs'
import FolderTiles, { type FolderTile } from '#/components/links/FolderTiles'
import LinksBrowserDialogs from '#/components/links/LinksBrowserDialogs'
import LinksBrowserEmpty from '#/components/links/LinksBrowserEmpty'
import LinksListView from '#/components/links/LinksListView'
import { folderMenuItems, linkMenuItems } from '#/components/links/links-browser-menus'
import { useLinksBrowserDialogs } from '#/components/links/use-links-browser-dialogs'
import { ShortcutChip } from '#/components/dashboard/CreateLinkChromeButton'
import { PlusIcon } from '#/components/icons/IcnMcp'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useShortcut } from '#/hooks/use-shortcut'
import type { LinkFolder, ShortLink } from '#/lib/api/types'
import {
  canCreateFolderIn,
  canMoveFolder,
  getChildFolders,
  getFolderPath,
  getLinksInFolder,
} from '#/lib/links/folder-tree'
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
    moveFolder,
    moveLink,
    setLinkHold,
    duplicateLink,
  } = useOrganization()
  const navigate = useNavigate()
  const dialogs = useLinksBrowserDialogs()
  const { setNewFolderOpen, setIsImportOpen } = dialogs

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

  const [actionError, setActionError] = useState<string | null>(null)
  /** Runs an action from a menu or drop, showing its failure above the list. */
  const run = (action: () => Promise<unknown>) => {
    setActionError(null)
    action().catch((err: unknown) =>
      setActionError(err instanceof Error ? err.message : 'Something went wrong.'),
    )
  }
  const canCreateFolderHere = canCreateFolderIn(folders, currentId)
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

  const folderMenu = (folder: LinkFolder) =>
    folderMenuItems(folder, {
      onOpen: (f) => onOpenFolder(f.id),
      onRename: dialogs.setRenaming,
      onMove: (f) =>
        dialogs.setMoving({ kind: 'folder', id: f.id, name: f.name, parentId: f.parentId ?? null }),
      onDelete: dialogs.setDeletingFolder,
    })

  const linkMenu = (link: ShortLink) =>
    linkMenuItems(link, {
      onOpen: (l) => openLink(l.id),
      onEdit: (l) => editLink(l.id),
      onDuplicate: (l) => run(async () => editLink((await duplicateLink(l.id)).id)),
      onSetHold: (l, isOnHold) =>
        run(() =>
          setLinkHold(l.id, isOnHold ? null : { page: l.hold?.page ?? 'bad-gateway' }),
        ),
      onMove: (l) =>
        dialogs.setMoving({ kind: 'link', id: l.id, name: linkTitle(l), folderId: l.folderId ?? null }),
      onDelete: dialogs.setDeletingLink,
    })

  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      {actionError ? <Banner status="error" title={actionError} /> : null}
      <HStack hAlign="between" vAlign="center" gap={4} wrap="wrap">
        <FolderBreadcrumbs path={path} onOpenFolder={onOpenFolder} onDropItem={dropItem} />
        <HStack gap={2} vAlign="center">
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
        </HStack>
      </HStack>

      {folderTiles.length === 0 && folderLinks.length === 0 ? (
        <LinksBrowserEmpty
          isInFolder={currentFolder != null}
          onImport={() => setIsImportOpen(true)}
          onNewFolder={() => setNewFolderOpen(true)}
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

      <LinksBrowserDialogs
        dialogs={dialogs}
        currentId={currentId}
        path={path}
        onOpenFolder={onOpenFolder}
        run={run}
      />
    </VStack>
  )
}
