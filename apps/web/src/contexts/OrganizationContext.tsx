import { useNavigate } from '@tanstack/react-router'
import { stableContext } from '#/lib/react/stable-context'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { useToast } from '@astryxdesign/core/Toast'
import { MAX_LINK_NOTES_LENGTH } from '@openlink/contracts'
import { useAnalyticsSummary } from '#/hooks/use-analytics'
import type { DeleteFolderMode, Domain, LinkFolder, LinkHold, ShortLink, UpdateLinkBody, Workspace } from '#/lib/api/types'
import { apiErrorMessage } from '#/lib/api/errors'
import { api, orpc } from '#/lib/api/orpc'
import {
  canCreateFolderIn,
  canMoveFolder,
  validateFolderName,
} from '#/lib/links/folder-tree'
import {
  draftToCreateBody,
  draftToUpdateBody,
  generateSlug,
  isSlugTaken,
  validateDraft,
  type CreateLinkDraft,
} from '#/lib/links/create-link'
import { ShortUrl } from '#/lib/links/short-url'
import { LinkLiveStatus, linkTitle } from '#/lib/links/link-summary'
import NotFoundPage from '#/components/not-found/NotFoundPage'
import WorkspaceStatusScreen, { type StatusPresentation } from '#/components/workspace/WorkspaceStatusScreen'
import {
  useWorkspaceDirectory,
  WorkspaceDirectoryProvider,
} from '#/contexts/WorkspaceDirectoryContext'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import { WorkspaceDeparture } from '#/lib/dashboard/workspace-departure'

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
   * Creates a link from the create-link form. Rejects with an Error carrying a
   * user-facing message when the draft is invalid or the API refuses it.
   */
  createLink: (draft: CreateLinkDraft) => Promise<ShortLink>
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

/** How often the links list (clicks, status) refreshes while the tab is visible. */
const LINKS_REFRESH_MS = 30_000

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

/** Bulk endpoints take at most this many ids per call. */
const BULK_LIMIT = 200
const chunks = <T,>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / BULK_LIMIT) }, (_, i) => items.slice(i * BULK_LIMIT, (i + 1) * BULK_LIMIT))

/** Page size for loading a workspace's links. */
const LINKS_PAGE = 200
/** Safety cap for one workspace list; the browser filters and searches locally. */
export const MAX_LINKS = 2000

/** Every link of a workspace, page by page up to `MAX_LINKS`. */
async function listAllLinks(organizationId: string): Promise<ShortLink[]> {
  const links: ShortLink[] = []
  for (let offset = 0; offset < MAX_LINKS; offset += LINKS_PAGE) {
    const page = await api.links.listOrganizationLinks({
      params: { organizationId },
      query: { limit: String(LINKS_PAGE), offset: String(offset) },
    })
    links.push(...page.items)
    if (links.length >= page.total || page.items.length === 0) break
  }
  return links
}

/** List responses carry their rows in `items`. Module-level so `select` stays stable. */
const selectItems = <T,>(data: { items: T[] }): T[] => data.items

/** Turns any failure into an Error whose message is safe to show. */
async function friendly<T>(run: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await run()
  } catch (error) {
    throw new Error(apiErrorMessage(error, fallback))
  }
}

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
  const queryClient = useQueryClient()
  const orgId = activeOrg.id
  const input = { params: { organizationId: orgId } }
  const linksKey = orpc.links.listOrganizationLinks.queryKey({ input: { ...input, query: {} } })
  const foldersKey = orpc.folders.listFolders.queryKey({ input })

  // Clicks land on the redirect path, outside this page, so the list refreshes
  // itself: on a timer while the tab is visible, and when you come back to it.
  const linksQuery = useQuery({
    queryKey: linksKey,
    queryFn: () => listAllLinks(orgId),
    refetchInterval: LINKS_REFRESH_MS,
    refetchOnWindowFocus: true,
  })
  const foldersQuery = useQuery(orpc.folders.listFolders.queryOptions({ input, select: selectItems }))
  // Domains never block the workspace; without them links fall back to the app host.
  const domainsQuery = useQuery(orpc.domains.listDomains.queryOptions({ input, select: selectItems }))

  const domains = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data])
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data])
  const links = useMemo(() => linksQuery.data ?? [], [linksQuery.data])

  // Writes refresh what they touched. Folder changes can move or delete links, so they refresh both.
  const refreshLinks = () => queryClient.invalidateQueries({ queryKey: linksKey })
  const refreshFolders = () =>
    Promise.all([queryClient.invalidateQueries({ queryKey: foldersKey }), queryClient.invalidateQueries({ queryKey: linksKey })])
  /** Shows a saved link at once, then re-reads the list. */
  const putLink = (link: ShortLink) => {
    queryClient.setQueryData<ShortLink[]>(linksKey, (prev = []) =>
      prev.some((l) => l.id === link.id) ? prev.map((l) => (l.id === link.id ? link : l)) : [link, ...prev],
    )
    return refreshLinks()
  }

  const createLinkMutation = useMutation(orpc.links.createWorkspaceLink.mutationOptions({ onSuccess: putLink }))
  const updateLinkMutation = useMutation(orpc.links.updateWorkspaceLink.mutationOptions({ onSuccess: putLink }))
  const moveLinksMutation = useMutation(orpc.links.moveLinks.mutationOptions({ onSuccess: refreshLinks }))
  const addTagsMutation = useMutation(orpc.links.addLinkTags.mutationOptions({ onSuccess: refreshLinks }))
  const deleteLinksMutation = useMutation(orpc.links.deleteLinks.mutationOptions({ onSuccess: refreshLinks }))
  const createFolderMutation = useMutation(orpc.folders.createFolder.mutationOptions({ onSuccess: refreshFolders }))
  const updateFolderMutation = useMutation(orpc.folders.updateFolder.mutationOptions({ onSuccess: refreshFolders }))
  const deleteFolderMutation = useMutation(orpc.folders.deleteFolder.mutationOptions({ onSuccess: refreshFolders }))

  /** Saves part of a link; fields left out keep their value. */
  const updateLink$ = (linkId: string, body: UpdateLinkBody) =>
    updateLinkMutation.mutateAsync({ params: { organizationId: orgId, linkId }, body })

  const shortHostFor = useCallback((domainId: string | null | undefined) => ShortUrl.host(domainId, domains), [domains])
  const shortUrlFor = useCallback(
    (slug: string, domainId: string | null | undefined) => ShortUrl.build(slug, domainId, domains),
    [domains],
  )

  // Link counts come from the links; click numbers from recorded clicks.
  const summary = useAnalyticsSummary(orgId).data
  const stats = useMemo<WorkspaceStats>(
    () => ({
      totalLinks: links.length,
      activeLinks: links.filter((link) => LinkLiveStatus.current(link) === 'active' && !LinkLiveStatus.isExpired(link)).length,
      clicksToday: summary?.clicksToday ?? 0,
      clicksThisWeek: summary?.clicksThisWeek ?? 0,
      uniqueVisitorsWeek: summary?.uniqueVisitorsWeek ?? 0,
      topReferrer: summary?.topReferrer ?? '—',
    }),
    [links, summary],
  )

  const requireFolder = useCallback(
    (folderId: string | null, message = 'That folder no longer exists.') => {
      if (folderId && !folders.some((f) => f.id === folderId)) throw new Error(message)
    },
    [folders],
  )

  const createLink = useCallback(
    async (draft: CreateLinkDraft) => {
      const first = Object.values(validateDraft(draft, { links }))[0]
      if (first) throw new Error(first)
      requireFolder(draft.folderId)

      let slug = draft.slug.trim()
      while (!slug || isSlugTaken(links, draft.domainId, slug)) slug = generateSlug()

      return createLinkMutation.mutateAsync({ params: { organizationId: orgId }, body: draftToCreateBody(draft, slug) })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, orgId, requireFolder],
  )

  const updateLink = useCallback(
    async (linkId: string, draft: CreateLinkDraft) => {
      const before = links.find((l) => l.id === linkId)
      if (!before) throw new Error('That link no longer exists.')
      const first = Object.values(
        validateDraft(draft, { links, editing: { linkId, hasPassword: !!before.passwordProtected } }),
      )[0]
      if (first) throw new Error(first)
      requireFolder(draft.folderId)

      return updateLink$(linkId, draftToUpdateBody(draft, before))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, orgId, requireFolder],
  )

  const duplicateLink = useCallback(
    async (linkId: string) => {
      const source = links.find((l) => l.id === linkId)
      if (!source) throw new Error('That link no longer exists.')
      let slug = `${source.slug}-copy`
      for (let n = 2; isSlugTaken(links, source.domainId ?? null, slug); n++) {
        slug = n > 9 ? generateSlug() : `${source.slug}-copy-${n}`
      }
      // Passwords are never readable, so a copy starts without one.
      const { id: _id, organizationId: _org, status: _status, enabled: _enabled, clickCount: _clicks, passwordProtected: _password, alias: _alias, createdAt: _created, updatedAt: _updated, ...settings } = source
      return createLinkMutation.mutateAsync({
        params: { organizationId: orgId },
        body: { ...settings, slug, title: `Copy of ${linkTitle(source)}` },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, orgId],
  )

  const moveLinks = useCallback(
    async (linkIds: string[], folderId: string | null) => {
      requireFolder(folderId, 'That destination no longer exists.')
      const ids = linkIds.filter((id) => (links.find((l) => l.id === id)?.folderId ?? null) !== folderId)
      if (ids.length === 0) return
      for (const batch of chunks(ids)) {
        await moveLinksMutation.mutateAsync({ params: { organizationId: orgId }, body: { linkIds: batch, folderId } })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, orgId, requireFolder],
  )

  const moveLink = useCallback((linkId: string, folderId: string | null) => moveLinks([linkId], folderId), [moveLinks])

  const setLinksHold = useCallback(
    async (linkIds: string[], hold: LinkHold | null) => {
      const wanted = new Set(linkIds)
      const targets = links.filter((l) => wanted.has(l.id) && (hold || l.hold))
      // Hold travels in the link's metadata, so each link is saved on its own.
      await Promise.all(targets.map((l) => updateLink$(l.id, { hold })))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [links, orgId],
  )

  const setLinkHold = useCallback((linkId: string, hold: LinkHold | null) => setLinksHold([linkId], hold), [setLinksHold])

  const saveLinkNotes = useCallback(
    async (linkId: string, notes: string) => {
      if (notes.length > MAX_LINK_NOTES_LENGTH) {
        throw new Error(`Keep notes under ${MAX_LINK_NOTES_LENGTH.toLocaleString()} characters.`)
      }
      await updateLink$(linkId, { description: notes.trim() || null })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  )

  const addTagsToLinks = useCallback(
    async (linkIds: string[], tags: string[]) => {
      const clean = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))]
      if (clean.length === 0 || linkIds.length === 0) return
      for (const batch of chunks(linkIds)) {
        await addTagsMutation.mutateAsync({ params: { organizationId: orgId }, body: { linkIds: batch, tags: clean } })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  )

  const deleteLinks = useCallback(
    async (linkIds: string[]) => {
      if (linkIds.length === 0) return
      for (const batch of chunks(linkIds)) {
        await deleteLinksMutation.mutateAsync({ params: { organizationId: orgId }, body: { linkIds: batch } })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  )

  const deleteLink = useCallback((linkId: string) => deleteLinks([linkId]), [deleteLinks])

  const createFolder = useCallback(
    async (name: string, parentId: string | null) => {
      requireFolder(parentId)
      if (!canCreateFolderIn(folders, parentId)) throw new Error('Folders cannot be nested any deeper.')
      const error = validateFolderName(folders, name, parentId)
      if (error) throw new Error(error)
      return createFolderMutation.mutateAsync({ params: { organizationId: orgId }, body: { name: name.trim(), parentId } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folders, orgId, requireFolder],
  )

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      const target = folders.find((f) => f.id === folderId)
      if (!target) throw new Error('That folder no longer exists.')
      const error = validateFolderName(folders, name, target.parentId ?? null, folderId)
      if (error) throw new Error(error)
      await updateFolderMutation.mutateAsync({ params: { organizationId: orgId, folderId }, body: { name: name.trim() } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folders, orgId],
  )

  const moveFolder = useCallback(
    async (folderId: string, parentId: string | null) => {
      const target = folders.find((f) => f.id === folderId)
      if (!target) throw new Error('That folder no longer exists.')
      if ((target.parentId ?? null) === parentId) return
      requireFolder(parentId, 'That destination no longer exists.')
      if (!canMoveFolder(folders, folderId, parentId)) {
        throw new Error('A folder cannot be moved into itself, its subfolders, or past the maximum depth.')
      }
      const error = validateFolderName(folders, target.name, parentId, folderId)
      if (error) throw new Error(error)
      await updateFolderMutation.mutateAsync({ params: { organizationId: orgId, folderId }, body: { parentId } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [folders, orgId, requireFolder],
  )

  const deleteFolder = useCallback(
    async (folderId: string, mode: DeleteFolderMode) => {
      // The server moves or deletes the contents; the mutation reloads both lists.
      await deleteFolderMutation.mutateAsync({ params: { organizationId: orgId, folderId }, query: { mode } })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
  )

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
      createLink: (draft) => friendly(() => createLink(draft), 'Could not create the link.'),
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
