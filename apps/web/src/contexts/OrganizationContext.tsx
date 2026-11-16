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
import { getStatsForOrg } from '#/data/demo/queries'
import type { WorkspaceCustomDomain } from '#/data/demo/domains'
import type {
  LinkComment,
  LinkFolder,
  LinkHold,
  Organization,
  OrgDashboardStats,
  ShortLink,
} from '#/data/demo/types'
import { demoCurrentUser } from '#/data/demo/current-user'
import { DEMO_USER_AVATAR_URL } from '#/components/dashboard/layout/dashboard-shell-colors'
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
import { HEALTH_LABEL, demoCheckHealth } from '#/lib/links/demo-health'
import {
  COMMENT_MAX_LENGTH,
  commentExcerpt,
  historyEvent,
  withEvent,
} from '#/lib/links/link-history'
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
  /** Puts a link on hold (or releases it with `null`). */
  setLinkHold: (linkId: string, hold: LinkHold | null) => Promise<void>
  moveLinks: (linkIds: string[], folderId: string | null) => Promise<void>
  setLinksHold: (linkIds: string[], hold: LinkHold | null) => Promise<void>
  addTagsToLinks: (linkIds: string[], tags: string[]) => Promise<void>
  deleteLinks: (linkIds: string[]) => Promise<void>
  /** Runs (demo) destination health checks; resolves when results are in. */
  checkLinksHealth: (linkIds: string[]) => Promise<void>
  deleteLink: (linkId: string) => Promise<void>
  /**
   * Comments on a link (kept for this session only until the comments API is
   * wired). Adding throws on empty or overlong text; only the author can edit or delete.
   */
  addLinkComment: (linkId: string, body: string) => LinkComment
  editLinkComment: (linkId: string, commentId: string, body: string) => void
  deleteLinkComment: (linkId: string, commentId: string) => void
  toggleCommentReaction: (linkId: string, commentId: string, emoji: string) => void
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

  // Comments and health checks have no API wiring yet; they live for the session.
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

  // Link counts come from the links themselves. Demo traffic only applies
  // once the org has links — no links means no clicks.
  const stats = useMemo<OrgDashboardStats>(() => {
    const counts = {
      totalLinks: links.length,
      activeLinks: links.filter((link) => link.status === 'active').length,
    }
    if (links.length === 0) {
      return { ...counts, clicksToday: 0, clicksThisWeek: 0, uniqueVisitorsWeek: 0, topReferrer: '—' }
    }
    return { ...getStatsForOrg(orgId), ...counts }
  }, [orgId, links])

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
        ...LinkMapper.toBody(rebuilt, password),
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
        targets.map((l) => linksApi.updateLink(orgId, l.id, LinkMapper.toBody({ ...l, hold: hold ?? undefined }))),
      )
      saved.forEach(putLink)
    },
    [links, orgId, putLink],
  )

  const setLinkHold = useCallback((linkId: string, hold: LinkHold | null) => setLinksHold([linkId], hold), [setLinksHold])

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

  /** Applies a session-only change (comments, health, their history) to links. */
  const updateLocal = useCallback(
    (linkIds: string[], change: (link: ShortLink) => ShortLink | null) => {
      for (const id of linkIds) {
        const current = links.find((l) => l.id === id)
        if (!current) continue
        const next = change(current)
        if (!next) continue
        const extras: LinkLocalExtras = { comments: next.comments, health: next.health, history: next.history }
        linksWorkspace$.extrasByLink[id].set(extras)
      }
    },
    [links],
  )

  const checkLinksHealth = useCallback(
    async (linkIds: string[]) => {
      // Demo: the backend runs real checks; simulate its latency.
      await new Promise((resolve) => setTimeout(resolve, 900))
      updateLocal(linkIds, (l) => {
        const health = demoCheckHealth(l)
        const before = l.health
        const changes =
          before && before.status !== health.status
            ? [{ label: 'Status', from: HEALTH_LABEL[before.status], to: HEALTH_LABEL[health.status] }]
            : []
        return withEvent(
          { ...l, health },
          historyEvent(
            'checked',
            `Checked destination: ${HEALTH_LABEL[health.status].toLowerCase()} (HTTP ${health.statusCode}, ${health.responseMs.toLocaleString()} ms)`,
            changes,
          ),
          { touch: false },
        )
      })
    },
    [updateLocal],
  )

  const addLinkComment = useCallback(
    (linkId: string, body: string) => {
      const text = body.trim()
      if (!text) throw new Error('Write something first.')
      if (text.length > COMMENT_MAX_LENGTH) throw new Error(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`)
      if (!links.some((l) => l.id === linkId)) throw new Error('That link no longer exists.')
      const now = new Date()
      const comment: LinkComment = {
        id: `cmt_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
        at: now.toISOString(),
        authorId: demoCurrentUser.id,
        authorName: demoCurrentUser.name,
        authorAvatarUrl: DEMO_USER_AVATAR_URL,
        body: text,
      }
      updateLocal([linkId], (l) =>
        withEvent(
          { ...l, comments: [...(l.comments ?? []), comment] },
          { ...historyEvent('commented', 'Left a comment', undefined, now, commentExcerpt(text)), commentId: comment.id },
          { touch: false },
        ),
      )
      return comment
    },
    [links, updateLocal],
  )

  const editLinkComment = useCallback(
    (linkId: string, commentId: string, body: string) => {
      const text = body.trim()
      if (!text) throw new Error('A comment cannot be empty. Delete it instead.')
      if (text.length > COMMENT_MAX_LENGTH) throw new Error(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`)
      updateLocal([linkId], (l) => {
        const target = l.comments?.find((c) => c.id === commentId)
        // Only the author can edit, and an unchanged body is not an edit.
        if (!target || target.authorId !== demoCurrentUser.id || target.body === text) return null
        return {
          ...l,
          comments: l.comments!.map((c) => (c.id === commentId ? { ...c, body: text, editedAt: new Date().toISOString() } : c)),
          // The timeline quotes the comment as it reads now.
          history: l.history?.map((e) => (e.commentId === commentId ? { ...e, excerpt: commentExcerpt(text) } : e)),
        }
      })
    },
    [updateLocal],
  )

  const deleteLinkComment = useCallback(
    (linkId: string, commentId: string) => {
      updateLocal([linkId], (l) => {
        const target = l.comments?.find((c) => c.id === commentId)
        if (!target || target.authorId !== demoCurrentUser.id) return null
        return {
          ...l,
          comments: l.comments!.filter((c) => c.id !== commentId),
          // Keep the fact that a comment happened, but not its words.
          history: l.history?.map((e) => {
            if (e.commentId !== commentId) return e
            const { excerpt: _dropped, ...rest } = e
            return { ...rest, summary: 'Left a comment (since deleted)' }
          }),
        }
      })
    },
    [updateLocal],
  )

  const toggleCommentReaction = useCallback(
    (linkId: string, commentId: string, emoji: string) => {
      updateLocal([linkId], (l) => {
        if (!l.comments?.some((c) => c.id === commentId)) return null
        return {
          ...l,
          comments: l.comments.map((c) => {
            if (c.id !== commentId) return c
            const people = c.reactions?.[emoji] ?? []
            const nextPeople = people.includes(demoCurrentUser.id)
              ? people.filter((id) => id !== demoCurrentUser.id)
              : [...people, demoCurrentUser.id]
            const { [emoji]: _removed, ...rest } = c.reactions ?? {}
            return { ...c, reactions: nextPeople.length > 0 ? { ...rest, [emoji]: nextPeople } : rest }
          }),
        }
      })
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
      setLinkHold: (id, hold) => friendly(() => setLinkHold(id, hold), 'Could not update the hold.'),
      moveLinks: (ids, folderId) => friendly(() => moveLinks(ids, folderId), 'Could not move the links.'),
      setLinksHold: (ids, hold) => friendly(() => setLinksHold(ids, hold), 'Could not update the hold.'),
      addTagsToLinks: (ids, tags) => friendly(() => addTagsToLinks(ids, tags), 'Could not add tags.'),
      deleteLinks: (ids) => friendly(() => deleteLinks(ids), 'Could not delete the links.'),
      checkLinksHealth,
      deleteLink: (id) => friendly(() => deleteLink(id), 'Could not delete the link.'),
      addLinkComment,
      editLinkComment,
      deleteLinkComment,
      toggleCommentReaction,
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
      setLinkHold,
      moveLinks,
      setLinksHold,
      addTagsToLinks,
      deleteLinks,
      checkLinksHealth,
      deleteLink,
      addLinkComment,
      editLinkComment,
      deleteLinkComment,
      toggleCommentReaction,
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
