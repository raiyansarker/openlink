import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { use$ } from '@legendapp/state/react'
import { MAX_LINK_NOTES_LENGTH } from '@openlink/contracts'
import { useAnalyticsSummary } from '#/hooks/use-analytics'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import type {
  LinkFolder,
  LinkHold,
  Organization,
  OrgDashboardStats,
  ShortLink,
} from '#/data/demo/types'
import { DomainsApi } from '#/lib/api/domains'
import { LinkMapper, LinksApi } from '#/lib/api/links'
import { QueryKeys } from '#/lib/api/query'
import { ApiError } from '#/lib/api/error'
import {
  canCreateFolderIn,
  canMoveFolder,
  validateFolderName,
  type DeleteFolderMode,
} from '#/lib/links/folder-tree'
import {
  draftToLink,
  generateSlug,
  isSlugTaken,
  validateDraft,
  type CreateLinkDraft,
} from '#/lib/links/create-link'
import { demoCheckHealth } from '#/lib/links/demo-health'
import { ShortUrl } from '#/lib/links/short-url'
import { linksWorkspace$, type LinkLocalExtras } from '#/state/links-workspace.state'
import NotFoundPage from '#/components/not-found/NotFoundPage'
import WorkspaceStatusScreen, { type StatusPresentation } from '#/components/workspace/WorkspaceStatusScreen'
import {
  useWorkspaceDirectory,
  WorkspaceDirectoryProvider,
} from '#/contexts/WorkspaceDirectoryContext'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'

type OrganizationContextValue = {
  organizations: Organization[]
  activeOrg: Organization
  activeOrgId: string
  links: ShortLink[]
  folders: LinkFolder[]
  /** Custom domains of the workspace (any readiness). */
  domains: WorkspaceCustomDomain[]
  stats: OrgDashboardStats
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
  /** Runs (demo) destination health checks; resolves when results are in. */
  checkLinksHealth: (linkIds: string[]) => Promise<void>
  deleteLink: (linkId: string) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

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

  useEffect(() => {
    if (activeOrg) ActiveWorkspace.remember(activeOrg.slug)
  }, [activeOrg])

  useEffect(() => {
    if (hasNoWorkspaces) void navigate({ to: '/create/organization', replace: true })
  }, [hasNoWorkspaces, navigate])

  if (status === 'error') {
    return <WorkspaceStatusScreen presentation={presentation} state="error" message={errorMessage ?? 'Try again.'} onRetry={refetch} />
  }
  if (status === 'loading' || hasNoWorkspaces) return <WorkspaceStatusScreen presentation={presentation} state="loading" />
  if (!activeOrg) return presentation === 'inline' ? <WorkspaceStatusScreen presentation="inline" state="missing" /> : <NotFoundPage />
  return (
    <OrganizationScope activeOrg={activeOrg} presentation={presentation}>
      {children}
    </OrganizationScope>
  )
}

const linksApi = new LinksApi()
const domainsApi = new DomainsApi()

/** Bulk endpoints take at most this many ids per call. */
const BULK_LIMIT = 200
const chunks = <T,>(items: T[]) =>
  Array.from({ length: Math.ceil(items.length / BULK_LIMIT) }, (_, i) => items.slice(i * BULK_LIMIT, (i + 1) * BULK_LIMIT))

/** Turns any failure into an Error whose message is safe to show. */
async function friendly<T>(run: () => Promise<T>, fallback: string): Promise<T> {
  try {
    return await run()
  } catch (error) {
    throw error instanceof ApiError ? error : ApiError.from(error, fallback)
  }
}

function OrganizationScope({
  activeOrg,
  presentation,
  children,
}: {
  activeOrg: Organization
  presentation: StatusPresentation
  children: ReactNode
}) {
  const { organizations } = useWorkspaceDirectory()
  const queryClient = useQueryClient()
  const orgId = activeOrg.id
  const linksKey = QueryKeys.links(orgId)
  const foldersKey = QueryKeys.folders(orgId)

  const linksQuery = useQuery({ queryKey: linksKey, queryFn: () => linksApi.listLinks(orgId) })
  const foldersQuery = useQuery({ queryKey: foldersKey, queryFn: () => linksApi.listFolders(orgId) })
  // Domains never block the workspace; without them links fall back to the app host.
  const domainsQuery = useQuery({ queryKey: QueryKeys.domains(orgId), queryFn: () => domainsApi.list(orgId) })

  // Health checks have no API yet; their results live for the session.
  const localExtras = use$(linksWorkspace$.extrasByLink)

  const domains = useMemo(() => domainsQuery.data ?? [], [domainsQuery.data])
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data])
  const links = useMemo(
    () => (linksQuery.data ?? []).map((link) => {
      const extras = localExtras[link.id]
      return extras ? { ...link, ...extras } : link
    }),
    [linksQuery.data, localExtras],
  )

  const setLinksCache = useCallback(
    (update: (prev: ShortLink[]) => ShortLink[]) =>
      queryClient.setQueryData<ShortLink[]>(linksKey, (prev) => update(prev ?? [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, orgId],
  )
  const setFoldersCache = useCallback(
    (update: (prev: LinkFolder[]) => LinkFolder[]) =>
      queryClient.setQueryData<LinkFolder[]>(foldersKey, (prev) => update(prev ?? [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, orgId],
  )
  /** Keeps a server copy of a link, without dropping session-only extras. */
  const putLink = useCallback(
    (link: ShortLink) =>
      setLinksCache((prev) => (prev.some((l) => l.id === link.id) ? prev.map((l) => (l.id === link.id ? link : l)) : [link, ...prev])),
    [setLinksCache],
  )

  const shortHostFor = useCallback((domainId: string | null | undefined) => ShortUrl.host(domainId, domains), [domains])
  const shortUrlFor = useCallback(
    (slug: string, domainId: string | null | undefined) => ShortUrl.build(slug, domainId, domains),
    [domains],
  )

  // Link counts come from the links; click numbers from recorded clicks.
  const summary = useAnalyticsSummary(orgId).data
  const stats = useMemo<OrgDashboardStats>(
    () => ({
      totalLinks: links.length,
      activeLinks: links.filter((link) => link.status === 'active').length,
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

      const link = draftToLink(draft, { orgId, id: '', slug })
      const created = await linksApi.createLink(orgId, link, draft.passwordEnabled ? draft.password : undefined)
      putLink(created)
      return created
    },
    [links, orgId, putLink, requireFolder],
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

      // Back-half and domain are fixed once a link exists.
      const rebuilt = draftToLink(
        { ...draft, slug: before.slug, domainId: before.domainId ?? null },
        { orgId, id: before.id, slug: before.slug },
      )
      const password = draft.passwordEnabled && draft.password ? draft.password : undefined
      const body = {
        ...LinkMapper.toUpdateBody(rebuilt, password),
        ...(!draft.passwordEnabled && before.passwordProtected ? { clearPassword: true } : {}),
      }
      const saved = await linksApi.updateLink(orgId, linkId, body)
      putLink(saved)
      return saved
    },
    [links, orgId, putLink, requireFolder],
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
      const copy = await linksApi.createLink(orgId, {
        ...source,
        slug,
        title: `Copy of ${source.title}`,
        passwordProtected: undefined,
      })
      putLink(copy)
      return copy
    },
    [links, orgId, putLink],
  )

  const moveLinks = useCallback(
    async (linkIds: string[], folderId: string | null) => {
      requireFolder(folderId, 'That destination no longer exists.')
      const ids = linkIds.filter((id) => (links.find((l) => l.id === id)?.folderId ?? null) !== folderId)
      if (ids.length === 0) return
      for (const batch of chunks(ids)) await linksApi.moveLinks(orgId, batch, folderId)
      const moved = new Set(ids)
      setLinksCache((prev) => prev.map((l) => (moved.has(l.id) ? { ...l, folderId } : l)))
    },
    [links, orgId, requireFolder, setLinksCache],
  )

  const moveLink = useCallback((linkId: string, folderId: string | null) => moveLinks([linkId], folderId), [moveLinks])

  const setLinksHold = useCallback(
    async (linkIds: string[], hold: LinkHold | null) => {
      const targets = links.filter((l) => linkIds.includes(l.id) && (hold || l.hold))
      // Hold travels in the link's metadata, so each link is saved on its own.
      const saved = await Promise.all(
        targets.map((l) => linksApi.updateLink(orgId, l.id, LinkMapper.toUpdateBody({ ...l, hold: hold ?? undefined }))),
      )
      saved.forEach(putLink)
    },
    [links, orgId, putLink],
  )

  const setLinkHold = useCallback((linkId: string, hold: LinkHold | null) => setLinksHold([linkId], hold), [setLinksHold])

  const saveLinkNotes = useCallback(
    async (linkId: string, notes: string) => {
      if (notes.length > MAX_LINK_NOTES_LENGTH) {
        throw new Error(`Keep notes under ${MAX_LINK_NOTES_LENGTH.toLocaleString()} characters.`)
      }
      const description = notes.trim() || null
      putLink(await linksApi.updateLink(orgId, linkId, { description }))
    },
    [orgId, putLink],
  )

  const addTagsToLinks = useCallback(
    async (linkIds: string[], tags: string[]) => {
      const clean = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))]
      if (clean.length === 0 || linkIds.length === 0) return
      for (const batch of chunks(linkIds)) await linksApi.addTags(orgId, batch, clean)
      const ids = new Set(linkIds)
      setLinksCache((prev) =>
        prev.map((l) => (ids.has(l.id) ? { ...l, tags: [...new Set([...l.tags, ...clean])] } : l)),
      )
    },
    [orgId, setLinksCache],
  )

  const deleteLinks = useCallback(
    async (linkIds: string[]) => {
      if (linkIds.length === 0) return
      for (const batch of chunks(linkIds)) await linksApi.deleteLinks(orgId, batch)
      const ids = new Set(linkIds)
      setLinksCache((prev) => prev.filter((l) => !ids.has(l.id)))
    },
    [orgId, setLinksCache],
  )

  const deleteLink = useCallback((linkId: string) => deleteLinks([linkId]), [deleteLinks])

  const createFolder = useCallback(
    async (name: string, parentId: string | null) => {
      requireFolder(parentId)
      if (!canCreateFolderIn(folders, parentId)) throw new Error('Folders cannot be nested any deeper.')
      const error = validateFolderName(folders, name, parentId)
      if (error) throw new Error(error)
      const created = await linksApi.createFolder(orgId, name.trim(), parentId)
      setFoldersCache((prev) => [...prev, created])
      return created
    },
    [folders, orgId, requireFolder, setFoldersCache],
  )

  const renameFolder = useCallback(
    async (folderId: string, name: string) => {
      const target = folders.find((f) => f.id === folderId)
      if (!target) throw new Error('That folder no longer exists.')
      const error = validateFolderName(folders, name, target.parentId, folderId)
      if (error) throw new Error(error)
      await linksApi.updateFolder(orgId, folderId, { name: name.trim() })
      setFoldersCache((prev) => prev.map((f) => (f.id === folderId ? { ...f, name: name.trim() } : f)))
    },
    [folders, orgId, setFoldersCache],
  )

  const moveFolder = useCallback(
    async (folderId: string, parentId: string | null) => {
      const target = folders.find((f) => f.id === folderId)
      if (!target) throw new Error('That folder no longer exists.')
      if (target.parentId === parentId) return
      requireFolder(parentId, 'That destination no longer exists.')
      if (!canMoveFolder(folders, folderId, parentId)) {
        throw new Error('A folder cannot be moved into itself, its subfolders, or past the maximum depth.')
      }
      const error = validateFolderName(folders, target.name, parentId, folderId)
      if (error) throw new Error(error)
      await linksApi.updateFolder(orgId, folderId, { parentId })
      setFoldersCache((prev) => prev.map((f) => (f.id === folderId ? { ...f, parentId } : f)))
    },
    [folders, orgId, requireFolder, setFoldersCache],
  )

  const deleteFolder = useCallback(
    async (folderId: string, mode: DeleteFolderMode) => {
      await linksApi.deleteFolder(orgId, folderId, mode)
      // The server moves or deletes the contents; reload both lists.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: foldersKey }),
        queryClient.invalidateQueries({ queryKey: linksKey }),
      ])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId, queryClient],
  )

  /** Applies a session-only change (health checks) to links. */
  const updateLocal = useCallback(
    (linkIds: string[], change: (link: ShortLink) => ShortLink | null) => {
      for (const id of linkIds) {
        const current = links.find((l) => l.id === id)
        if (!current) continue
        const next = change(current)
        if (!next) continue
        const extras: LinkLocalExtras = { health: next.health }
        linksWorkspace$.extrasByLink[id].set(extras)
      }
    },
    [links],
  )

  const checkLinksHealth = useCallback(
    async (linkIds: string[]) => {
      // Demo: the backend runs real checks; simulate its latency.
      await new Promise((resolve) => setTimeout(resolve, 900))
      updateLocal(linkIds, (l) => ({ ...l, health: demoCheckHealth(l) }))
    },
    [updateLocal],
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
      checkLinksHealth,
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
      checkLinksHealth,
      deleteLink,
    ],
  )

  if (linksQuery.isError || foldersQuery.isError) {
    const error = linksQuery.error ?? foldersQuery.error
    return (
      <WorkspaceStatusScreen
        presentation={presentation}
        state="error"
        message={ApiError.message(error, 'Could not load this workspace’s links.')}
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
