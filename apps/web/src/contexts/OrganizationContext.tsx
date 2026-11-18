import { useNavigate } from '@tanstack/react-router'
import { stableContext } from '#/lib/react/stable-context'
import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useToast } from '@astryxdesign/core/Toast'
import type { DeleteFolderMode, Domain, LinkFolder, LinkHold, ShortLink, Workspace } from '#/lib/api/types'
import { apiErrorMessage } from '#/lib/api/errors'
import type { CreateLinkDraft } from '#/lib/links/create-link'
import NotFoundPage from '#/components/not-found/NotFoundPage'
import WorkspaceStatusScreen, { type StatusPresentation } from '#/components/workspace/WorkspaceStatusScreen'
import {
  useWorkspaceDirectory,
  WorkspaceDirectoryProvider,
} from '#/contexts/WorkspaceDirectoryContext'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import { WorkspaceDeparture } from '#/lib/dashboard/workspace-departure'
import { friendly } from '#/contexts/organization/workspace-api'
import { useFolderActions } from '#/contexts/organization/use-folder-actions'
import { useLinkActions } from '#/contexts/organization/use-link-actions'
import { useWorkspaceData } from '#/contexts/organization/use-workspace-data'

type OrganizationContextValue = {
  organizations: Workspace[]
  activeOrg: Workspace
  activeOrgId: string
  links: ShortLink[]
  folders: LinkFolder[]
  /** Custom domains of the workspace (any readiness). */
  domains: Domain[]
  stats: WorkspaceStats
  /** Host a link is served on: its custom domain, or the app's own host. */
  shortHostFor: (domainId: string | null | undefined) => string
  shortUrlFor: (slug: string, domainId: string | null | undefined) => string
  /**
   * Creates a link from the create-link form, with its share-card image in the same request.
   * Rejects with an Error carrying a user-facing message when the draft is invalid or the
   * API refuses it; then nothing was created.
   */
  createLink: (draft: CreateLinkDraft, previewImage?: File | null) => Promise<ShortLink>
  /** Replaces a saved link's share-card image (a PATCH carrying only the image); resolves to the updated link. */
  setLinkPreviewImage: (linkId: string, image: File) => Promise<ShortLink>
  /** Folder actions reject with an Error carrying a user-facing message. */
  createFolder: (name: string, parentId: string | null) => Promise<LinkFolder>
  renameFolder: (folderId: string, name: string) => Promise<void>
  moveFolder: (folderId: string, parentId: string | null) => Promise<void>
  deleteFolder: (folderId: string, mode: DeleteFolderMode) => Promise<void>
  /** Saves edits from the form. Back-half and domain never change; an empty password keeps the current one. */
  updateLink: (linkId: string, draft: CreateLinkDraft) => Promise<ShortLink>
  /** Copies a link with a new back-half; resolves to the copy. */
  duplicateLink: (linkId: string) => Promise<ShortLink>
  moveLink: (linkId: string, folderId: string | null) => Promise<void>
  /** Saves only the link's team notes; an empty string clears them. */
  saveLinkNotes: (linkId: string, notes: string) => Promise<void>
  /** Puts a link on hold (or releases it with `null`). */
  setLinkHold: (linkId: string, hold: LinkHold | null) => Promise<void>
  moveLinks: (linkIds: string[], folderId: string | null) => Promise<void>
  setLinksHold: (linkIds: string[], hold: LinkHold | null) => Promise<void>
  addTagsToLinks: (linkIds: string[], tags: string[]) => Promise<void>
  deleteLinks: (linkIds: string[]) => Promise<void>
  deleteLink: (linkId: string) => Promise<void>
}

/** Overview numbers: link counts from the loaded links, clicks from recorded analytics. */
export type WorkspaceStats = {
  totalLinks: number
  activeLinks: number
  clicksToday: number
  clicksThisWeek: number
  uniqueVisitorsWeek: number
  topReferrer: string
}

const OrganizationContext = stableContext<OrganizationContextValue | null>('Workspace', null)

type OrganizationProviderProps = {
  /** Workspace from the URL. Without it, the remembered (or first) workspace is used. */
  orgSlugFromRoute?: string
  /** `inline` when rendered inside another layout (settings), so loading states fit the panel. */
  presentation?: StatusPresentation
  children: ReactNode
}

/**
 * Loads the user's workspaces, then renders `children` inside the chosen one.
 * Shows a loading or error screen meanwhile, a 404 for a workspace the user
 * does not belong to, and sends users with no workspace to create one.
 */
export function OrganizationProvider({ orgSlugFromRoute, presentation, children }: OrganizationProviderProps) {
  return (
    <WorkspaceDirectoryProvider>
      <WorkspaceGate orgSlugFromRoute={orgSlugFromRoute} presentation={presentation}>
        {children}
      </WorkspaceGate>
    </WorkspaceDirectoryProvider>
  )
}

function WorkspaceGate({ orgSlugFromRoute, presentation = 'page', children }: OrganizationProviderProps) {
  const { organizations, status, errorMessage, refetch } = useWorkspaceDirectory()
  const navigate = useNavigate()
  const activeOrg = status === 'ready' ? ActiveWorkspace.pick(organizations, orgSlugFromRoute) : null
  const hasNoWorkspaces = status === 'ready' && organizations.length === 0
  const showToast = useToast()

  // The workspace we were just in. If it drops out of the list while we're on
  // its pages, we were removed from it (or it was deleted or renamed).
  const lastActive = useRef<Workspace | null>(null)
  const departure = useMemo(
    () =>
      status === 'ready' && !activeOrg && orgSlugFromRoute && lastActive.current?.slug === orgSlugFromRoute
        ? WorkspaceDeparture.of(lastActive.current, organizations)
        : null,
    [status, activeOrg, orgSlugFromRoute, organizations],
  )

  useEffect(() => {
    if (activeOrg) lastActive.current = activeOrg
  }, [activeOrg])

  useEffect(() => {
    if (!departure) return
    if (departure.kind === 'renamed') {
      // Same workspace, new URL: follow it, keeping the section you were on.
      const next = WorkspaceUrl.replaceOrg(window.location.pathname, departure.to.slug)
      void navigate({ href: `${next}${window.location.search}`, replace: true })
      return
    }
    lastActive.current = null
    showToast({
      body: `You no longer have access to ${departure.from.name}.`,
      uniqueID: `left-${departure.from.id}`,
    })
    // `/w` opens one of your other workspaces, or sets up a new one.
    void navigate({ to: '/w', replace: true })
  }, [departure, navigate, showToast])

  useEffect(() => {
    if (activeOrg) ActiveWorkspace.remember(activeOrg.slug)
  }, [activeOrg])

  useEffect(() => {
    if (hasNoWorkspaces) void navigate({ to: '/create/organization', replace: true })
  }, [hasNoWorkspaces, navigate])

  if (status === 'error') {
    return <WorkspaceStatusScreen presentation={presentation} state="error" message={errorMessage ?? 'Try again.'} onRetry={refetch} />
  }
  if (status === 'loading' || hasNoWorkspaces || departure) return <WorkspaceStatusScreen presentation={presentation} state="loading" />
  if (!activeOrg) return presentation === 'inline' ? <WorkspaceStatusScreen presentation="inline" state="missing" /> : <NotFoundPage />
  return (
    <OrganizationScope activeOrg={activeOrg} presentation={presentation}>
      {children}
    </OrganizationScope>
  )
}

/** Safety cap for one workspace list; the browser filters and searches locally. */
export { MAX_LINKS } from '#/contexts/organization/workspace-api'

function OrganizationScope({
  activeOrg,
  presentation,
  children,
}: {
  activeOrg: Workspace
  presentation: StatusPresentation
  children: ReactNode
}) {
  const { organizations } = useWorkspaceDirectory()
  const {
    orgId,
    linksQuery,
    foldersQuery,
    domains,
    folders,
    links,
    stats,
    shortHostFor,
    shortUrlFor,
    requireFolder,
    putLink,
    refreshLinks,
    refreshFolders,
  } = useWorkspaceData(activeOrg)

  const {
    createLink,
    setLinkPreviewImage,
    updateLink,
    duplicateLink,
    moveLinks,
    moveLink,
    setLinksHold,
    setLinkHold,
    saveLinkNotes,
    addTagsToLinks,
    deleteLinks,
    deleteLink,
  } = useLinkActions({ orgId, links, requireFolder, putLink, refreshLinks })
  const { createFolder, renameFolder, moveFolder, deleteFolder } = useFolderActions({
    orgId,
    folders,
    requireFolder,
    refreshFolders,
  })

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      activeOrg,
      activeOrgId: activeOrg.id,
      links,
      folders,
      domains,
      stats,
      shortHostFor,
      shortUrlFor,
      createLink: (draft, previewImage) => friendly(() => createLink(draft, previewImage), 'Could not create the link.'),
      setLinkPreviewImage: (id, image) => friendly(() => setLinkPreviewImage(id, image), 'Could not save the share image.'),
      createFolder: (name, parentId) => friendly(() => createFolder(name, parentId), 'Could not create the folder.'),
      renameFolder: (id, name) => friendly(() => renameFolder(id, name), 'Could not rename the folder.'),
      moveFolder: (id, parentId) => friendly(() => moveFolder(id, parentId), 'Could not move the folder.'),
      deleteFolder: (id, mode) => friendly(() => deleteFolder(id, mode), 'Could not delete the folder.'),
      updateLink: (id, draft) => friendly(() => updateLink(id, draft), 'Could not save the link.'),
      duplicateLink: (id) => friendly(() => duplicateLink(id), 'Could not duplicate the link.'),
      moveLink: (id, folderId) => friendly(() => moveLink(id, folderId), 'Could not move the link.'),
      saveLinkNotes: (id, notes) => friendly(() => saveLinkNotes(id, notes), 'Could not save the notes.'),
      setLinkHold: (id, hold) => friendly(() => setLinkHold(id, hold), 'Could not update the hold.'),
      moveLinks: (ids, folderId) => friendly(() => moveLinks(ids, folderId), 'Could not move the links.'),
      setLinksHold: (ids, hold) => friendly(() => setLinksHold(ids, hold), 'Could not update the hold.'),
      addTagsToLinks: (ids, tags) => friendly(() => addTagsToLinks(ids, tags), 'Could not add tags.'),
      deleteLinks: (ids) => friendly(() => deleteLinks(ids), 'Could not delete the links.'),
      deleteLink: (id) => friendly(() => deleteLink(id), 'Could not delete the link.'),
    }),
    [
      organizations,
      activeOrg,
      links,
      folders,
      domains,
      stats,
      shortHostFor,
      shortUrlFor,
      createLink,
      setLinkPreviewImage,
      createFolder,
      renameFolder,
      moveFolder,
      deleteFolder,
      updateLink,
      duplicateLink,
      moveLink,
      saveLinkNotes,
      setLinkHold,
      moveLinks,
      setLinksHold,
      addTagsToLinks,
      deleteLinks,
      deleteLink,
    ],
  )

  if (linksQuery.isError || foldersQuery.isError) {
    const error = linksQuery.error ?? foldersQuery.error
    return (
      <WorkspaceStatusScreen
        presentation={presentation}
        state="error"
        message={apiErrorMessage(error, 'Could not load this workspace’s links.')}
        onRetry={() => {
          void linksQuery.refetch()
          void foldersQuery.refetch()
        }}
      />
    )
  }
  if (linksQuery.isPending || foldersQuery.isPending) {
    return <WorkspaceStatusScreen presentation={presentation} state="loading" />
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext)
  if (!ctx) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return ctx
}
