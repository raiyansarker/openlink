import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { use$ } from '@legendapp/state/react'
import {
  getFoldersForOrg,
  getLinksForOrg,
  getOrganizationBySlug,
  getStatsForOrg,
} from '#/data/demo/queries'
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
import {
  canCreateFolderIn,
  canMoveFolder,
  deleteFolderFromTree,
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
import { folderPathLabel } from '#/lib/links/folder-tree'
import {
  COMMENT_MAX_LENGTH,
  commentExcerpt,
  diffLinks,
  historyEvent,
  withEvent,
} from '#/lib/links/link-history'
import { holdPageMeta } from '#/lib/links/hold-pages'
import { linksWorkspace$ } from '#/state/links-workspace.state'
import {
  useWorkspaceDirectory,
  type CreateOrganizationInput,
} from '#/contexts/WorkspaceDirectoryContext'

export type { CreateOrganizationInput }


type OrganizationContextValue = {
  organizations: Organization[]
  activeOrg: Organization
  activeOrgId: string
  links: ShortLink[]
  folders: LinkFolder[]
  stats: OrgDashboardStats
  /**
   * Creates a link from the create-link form. Throws an Error with a
   * user-facing message when the draft is invalid. A blank slug is generated.
   */
  createLink: (draft: CreateLinkDraft) => ShortLink
  /** Folder actions throw an Error with a user-facing message on invalid input. */
  createFolder: (name: string, parentId: string | null) => LinkFolder
  renameFolder: (folderId: string, name: string) => void
  moveFolder: (folderId: string, parentId: string | null) => void
  deleteFolder: (folderId: string, mode: DeleteFolderMode) => void
  /**
   * Saves edits from the form. Back-half and domain never change; an empty
   * password keeps the current one. Records the diff in the link's history.
   */
  updateLink: (linkId: string, draft: CreateLinkDraft) => ShortLink
  /** Copies a link with a new back-half; returns the copy. */
  duplicateLink: (linkId: string) => ShortLink
  moveLink: (linkId: string, folderId: string | null) => void
  /** Puts a link on hold (or releases it with `null`). */
  setLinkHold: (linkId: string, hold: LinkHold | null) => void
  /** Bulk versions (one history event per link). */
  moveLinks: (linkIds: string[], folderId: string | null) => void
  setLinksHold: (linkIds: string[], hold: LinkHold | null) => void
  addTagsToLinks: (linkIds: string[], tags: string[]) => void
  deleteLinks: (linkIds: string[]) => void
  /** Runs (demo) destination health checks; resolves when results are in. */
  checkLinksHealth: (linkIds: string[]) => Promise<void>
  deleteLink: (linkId: string) => void
  /**
   * Comments on a link. Adding throws an Error with a user-facing message on
   * empty or overlong text; only the author can edit or delete a comment.
   */
  addLinkComment: (linkId: string, body: string) => LinkComment
  editLinkComment: (linkId: string, commentId: string, body: string) => void
  deleteLinkComment: (linkId: string, commentId: string) => void
  /** Adds or removes the current user's reaction. */
  toggleCommentReaction: (linkId: string, commentId: string, emoji: string) => void
  createOrganization: (input: CreateOrganizationInput) => Organization
  orgCustomIcons: Record<string, string>
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

type OrganizationProviderProps = {
  orgSlugFromRoute: string
  children: ReactNode
}

export function OrganizationProvider({
  orgSlugFromRoute,
  children,
}: OrganizationProviderProps) {
  const {
    organizations,
    createOrganization,
    orgCustomIcons,
  } = useWorkspaceDirectory()

  const activeOrg =
    organizations.find((org) => org.slug === orgSlugFromRoute) ??
    getOrganizationBySlug(orgSlugFromRoute) ??
    organizations[0]

  const orgId = activeOrg.id

  // Shared, session-wide working copies (see links-workspace.state.ts);
  // orgs without edits fall back to the demo fixtures.
  const storedLinks = use$(linksWorkspace$.linksByOrg[orgId])
  const storedFolders = use$(linksWorkspace$.foldersByOrg[orgId])
  const links = useMemo(
    () => storedLinks ?? getLinksForOrg(orgId),
    [storedLinks, orgId],
  )
  const folders = useMemo(
    () => storedFolders ?? getFoldersForOrg(orgId),
    [storedFolders, orgId],
  )

  const writeLinks = useCallback(
    (update: (prev: ShortLink[]) => ShortLink[]) => {
      const node = linksWorkspace$.linksByOrg[orgId]
      node.set(update(node.peek() ?? getLinksForOrg(orgId)))
    },
    [orgId],
  )

  const writeFolders = useCallback(
    (update: (prev: LinkFolder[]) => LinkFolder[]) => {
      const node = linksWorkspace$.foldersByOrg[orgId]
      node.set(update(node.peek() ?? getFoldersForOrg(orgId)))
    },
    [orgId],
  )

  // Link counts come from the links themselves. Demo traffic only applies
  // once the org has links — no links means no clicks.
  const stats = useMemo<OrgDashboardStats>(() => {
    const counts = {
      totalLinks: links.length,
      activeLinks: links.filter((link) => link.status === 'active').length,
    }
    if (links.length === 0) {
      return {
        ...counts,
        clicksToday: 0,
        clicksThisWeek: 0,
        uniqueVisitorsWeek: 0,
        topReferrer: '—',
      }
    }
    return { ...getStatsForOrg(orgId), ...counts }
  }, [orgId, links])

  const createLink = useCallback(
    (draft: CreateLinkDraft) => {
      const errors = validateDraft(draft, { links })
      const first = Object.values(errors)[0]
      if (first) throw new Error(first)
      if (draft.folderId && !folders.some((f) => f.id === draft.folderId)) {
        throw new Error('That folder no longer exists.')
      }

      let slug = draft.slug.trim()
      while (!slug || isSlugTaken(links, draft.domainId, slug)) {
        slug = generateSlug()
      }

      const created = withEvent(
        draftToLink(draft, {
          orgId,
          id: `link_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          slug,
        }),
        historyEvent('created', 'Created the link'),
      )
      writeLinks((prev) => [created, ...prev])
      return created
    },
    [folders, links, orgId, writeLinks],
  )

  const createFolder = useCallback(
    (name: string, parentId: string | null) => {
      if (parentId && !folders.some((f) => f.id === parentId)) {
        throw new Error('That folder no longer exists.')
      }
      if (!canCreateFolderIn(folders, parentId)) {
        throw new Error('Folders cannot be nested any deeper.')
      }
      const error = validateFolderName(folders, name, parentId)
      if (error) throw new Error(error)
      const created: LinkFolder = {
        id: `fld_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orgId,
        parentId,
        name: name.trim(),
        createdAt: new Date().toISOString(),
      }
      writeFolders((prev) => [...prev, created])
      return created
    },
    [folders, orgId, writeFolders],
  )

  const renameFolder = useCallback(
    (folderId: string, name: string) => {
      const target = folders.find((f) => f.id === folderId)
      if (!target) throw new Error('That folder no longer exists.')
      const error = validateFolderName(folders, name, target.parentId, folderId)
      if (error) throw new Error(error)
      writeFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: name.trim() } : f)),
      )
    },
    [folders, writeFolders],
  )

  const moveFolder = useCallback(
    (folderId: string, parentId: string | null) => {
      const target = folders.find((f) => f.id === folderId)
      if (!target) throw new Error('That folder no longer exists.')
      if (target.parentId === parentId) return
      if (parentId && !folders.some((f) => f.id === parentId)) {
        throw new Error('That destination no longer exists.')
      }
      if (!canMoveFolder(folders, folderId, parentId)) {
        throw new Error(
          'A folder cannot be moved into itself, its subfolders, or past the maximum depth.',
        )
      }
      const error = validateFolderName(folders, target.name, parentId, folderId)
      if (error) throw new Error(error)
      writeFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, parentId } : f)),
      )
    },
    [folders, writeFolders],
  )

  const deleteFolder = useCallback(
    (folderId: string, mode: DeleteFolderMode) => {
      const result = deleteFolderFromTree(folders, links, folderId, mode)
      writeFolders(() => result.folders)
      writeLinks(() => result.links)
    },
    [folders, links, writeFolders, writeLinks],
  )

  /** Applies `change` to the given links in one write. */
  const updateLinks = useCallback(
    (linkIds: string[], change: (link: ShortLink) => ShortLink | null) => {
      const ids = new Set(linkIds)
      writeLinks((prev) =>
        prev.map((l) => (ids.has(l.id) ? (change(l) ?? l) : l)),
      )
    },
    [writeLinks],
  )

  const updateLink = useCallback(
    (linkId: string, draft: CreateLinkDraft) => {
      const before = links.find((l) => l.id === linkId)
      if (!before) throw new Error('That link no longer exists.')
      const errors = validateDraft(draft, {
        links,
        editing: { linkId, hasPassword: !!before.passwordProtected },
      })
      const first = Object.values(errors)[0]
      if (first) throw new Error(first)
      if (draft.folderId && !folders.some((f) => f.id === draft.folderId)) {
        throw new Error('That folder no longer exists.')
      }

      // Back-half and domain are fixed once a link exists.
      const rebuilt = draftToLink(
        { ...draft, slug: before.slug, domainId: before.domainId ?? null },
        { orgId, id: before.id, slug: before.slug },
      )
      const merged: ShortLink = {
        ...rebuilt,
        // Facts that editing never changes.
        createdAt: before.createdAt,
        clicks: before.clicks,
        uniqueClicks: before.uniqueClicks,
        health: before.health,
        history: before.history,
        comments: before.comments,
        updatedAt: before.updatedAt,
        // Status stays what it was unless the schedule decides otherwise.
        status:
          rebuilt.status === 'scheduled' || before.status === 'scheduled'
            ? rebuilt.status
            : before.status,
        passwordProtected: rebuilt.passwordProtected,
      }
      const changes = diffLinks(before, merged, folders)
      const next =
        changes.length > 0
          ? withEvent(
              merged,
              historyEvent(
                'updated',
                changes.length === 1
                  ? `Changed ${changes[0]!.label.toLowerCase()}`
                  : `Changed ${changes.length} settings`,
                changes,
              ),
            )
          : merged
      writeLinks((prev) => prev.map((l) => (l.id === linkId ? next : l)))
      return next
    },
    [folders, links, orgId, writeLinks],
  )

  const duplicateLink = useCallback(
    (linkId: string) => {
      const source = links.find((l) => l.id === linkId)
      if (!source) throw new Error('That link no longer exists.')
      let slug = `${source.slug}-copy`
      for (let n = 2; isSlugTaken(links, source.domainId ?? null, slug); n++) {
        slug = n > 9 ? generateSlug() : `${source.slug}-copy-${n}`
      }
      const now = new Date().toISOString()
      const copy = withEvent(
        {
          ...source,
          id: `link_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          slug,
          title: `Copy of ${source.title}`,
          clicks: 0,
          uniqueClicks: 0,
          createdAt: now,
          health: undefined,
          history: [],
          comments: [],
        },
        historyEvent('duplicated', `Duplicated from /${source.slug}`),
      )
      writeLinks((prev) => [copy, ...prev])
      return copy
    },
    [links, writeLinks],
  )

  const moveLinks = useCallback(
    (linkIds: string[], folderId: string | null) => {
      if (folderId && !folders.some((f) => f.id === folderId)) {
        throw new Error('That destination no longer exists.')
      }
      const label = folderPathLabel(folders, folderId)
      updateLinks(linkIds, (l) =>
        (l.folderId ?? null) === folderId
          ? null
          : withEvent(
              { ...l, folderId },
              historyEvent('moved', `Moved to ${label}`, [
                {
                  label: 'Folder',
                  from: folderPathLabel(folders, l.folderId ?? null),
                  to: label,
                },
              ]),
            ),
      )
    },
    [folders, updateLinks],
  )

  const moveLink = useCallback(
    (linkId: string, folderId: string | null) => moveLinks([linkId], folderId),
    [moveLinks],
  )

  const setLinksHold = useCallback(
    (linkIds: string[], hold: LinkHold | null) => {
      updateLinks(linkIds, (l) => {
        if (!hold && !l.hold) return null
        return withEvent(
          { ...l, hold: hold ?? undefined },
          hold
            ? historyEvent(
                'held',
                `Put on hold — showing ${holdPageMeta(hold.page).label}`,
              )
            : historyEvent('released', 'Released the hold'),
        )
      })
    },
    [updateLinks],
  )

  const setLinkHold = useCallback(
    (linkId: string, hold: LinkHold | null) => setLinksHold([linkId], hold),
    [setLinksHold],
  )

  const addTagsToLinks = useCallback(
    (linkIds: string[], tags: string[]) => {
      const clean = [
        ...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)),
      ]
      if (clean.length === 0) return
      updateLinks(linkIds, (l) => {
        const added = clean.filter((t) => !l.tags.includes(t))
        if (added.length === 0) return null
        return withEvent(
          { ...l, tags: [...l.tags, ...added] },
          historyEvent(
            'tagged',
            `Added ${added.map((t) => `#${t}`).join(' ')}`,
          ),
        )
      })
    },
    [updateLinks],
  )

  const deleteLinks = useCallback(
    (linkIds: string[]) => {
      const ids = new Set(linkIds)
      writeLinks((prev) => prev.filter((l) => !ids.has(l.id)))
    },
    [writeLinks],
  )

  const deleteLink = useCallback(
    (linkId: string) => deleteLinks([linkId]),
    [deleteLinks],
  )

  const checkLinksHealth = useCallback(
    async (linkIds: string[]) => {
      // Demo: the backend runs real checks; simulate its latency.
      await new Promise((resolve) => setTimeout(resolve, 900))
      updateLinks(linkIds, (l) => {
        const health = demoCheckHealth(l)
        const before = l.health
        const changes =
          before && before.status !== health.status
            ? [
                {
                  label: 'Status',
                  from: HEALTH_LABEL[before.status],
                  to: HEALTH_LABEL[health.status],
                },
              ]
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
    [updateLinks],
  )

  const addLinkComment = useCallback(
    (linkId: string, body: string) => {
      const text = body.trim()
      if (!text) throw new Error('Write something first.')
      if (text.length > COMMENT_MAX_LENGTH) {
        throw new Error(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`)
      }
      if (!links.some((l) => l.id === linkId)) {
        throw new Error('That link no longer exists.')
      }
      const now = new Date()
      const comment: LinkComment = {
        id: `cmt_${now.getTime()}_${Math.random().toString(36).slice(2, 7)}`,
        at: now.toISOString(),
        authorId: demoCurrentUser.id,
        authorName: demoCurrentUser.name,
        authorAvatarUrl: DEMO_USER_AVATAR_URL,
        body: text,
      }
      updateLinks([linkId], (l) =>
        withEvent(
          { ...l, comments: [...(l.comments ?? []), comment] },
          {
            ...historyEvent('commented', 'Left a comment', undefined, now, commentExcerpt(text)),
            commentId: comment.id,
          },
          { touch: false },
        ),
      )
      return comment
    },
    [links, updateLinks],
  )

  const editLinkComment = useCallback(
    (linkId: string, commentId: string, body: string) => {
      const text = body.trim()
      if (!text) throw new Error('A comment cannot be empty. Delete it instead.')
      if (text.length > COMMENT_MAX_LENGTH) {
        throw new Error(`Comments can be up to ${COMMENT_MAX_LENGTH} characters.`)
      }
      updateLinks([linkId], (l) => {
        const target = l.comments?.find((c) => c.id === commentId)
        // Only the author can edit, and an unchanged body is not an edit.
        if (!target || target.authorId !== demoCurrentUser.id || target.body === text) {
          return null
        }
        return {
          ...l,
          comments: l.comments!.map((c) =>
            c.id === commentId ? { ...c, body: text, editedAt: new Date().toISOString() } : c,
          ),
          // The timeline quotes the comment as it reads now.
          history: l.history?.map((e) =>
            e.commentId === commentId ? { ...e, excerpt: commentExcerpt(text) } : e,
          ),
        }
      })
    },
    [updateLinks],
  )

  const deleteLinkComment = useCallback(
    (linkId: string, commentId: string) => {
      updateLinks([linkId], (l) => {
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
    [updateLinks],
  )

  const toggleCommentReaction = useCallback(
    (linkId: string, commentId: string, emoji: string) => {
      updateLinks([linkId], (l) => {
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
            return {
              ...c,
              reactions: nextPeople.length > 0 ? { ...rest, [emoji]: nextPeople } : rest,
            }
          }),
        }
      })
    },
    [updateLinks],
  )

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organizations,
      activeOrg,
      activeOrgId: activeOrg.id,
      links,
      folders,
      stats,
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
      createOrganization,
      orgCustomIcons,
    }),
    [
      organizations,
      activeOrg,
      links,
      folders,
      stats,
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
      createOrganization,
      orgCustomIcons,
    ],
  )

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext)
  if (!ctx) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return ctx
}
