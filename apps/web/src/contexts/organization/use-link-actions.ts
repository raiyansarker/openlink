import { useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MAX_LINK_NOTES_LENGTH } from '@openlink/contracts'
import type { LinkHold, ShortLink, UpdateLinkBody } from '#/lib/api/types'
import { orpc } from '#/lib/api/orpc'
import {
  draftToCreateBody,
  draftToUpdateBody,
  generateSlug,
  isSlugTaken,
  validateDraft,
  type CreateLinkDraft,
} from '#/lib/links/create-link'
import { linkTitle } from '#/lib/links/link-summary'
import { chunks } from '#/contexts/organization/workspace-api'

type LinkActionsInput = {
  orgId: string
  links: ShortLink[]
  requireFolder: (folderId: string | null, message?: string) => void
  /** Shows a saved link at once, then re-reads the list. */
  putLink: (link: ShortLink) => unknown
  refreshLinks: () => unknown
}

/** Everything that creates, edits, moves, tags or deletes links. Each rejects with an Error when it can't proceed. */
export function useLinkActions({ orgId, links, requireFolder, putLink, refreshLinks }: LinkActionsInput) {
  const createLinkMutation = useMutation(orpc.links.createWorkspaceLink.mutationOptions({ onSuccess: putLink }))
  const updateLinkMutation = useMutation(orpc.links.updateWorkspaceLink.mutationOptions({ onSuccess: putLink }))
  const moveLinksMutation = useMutation(orpc.links.moveLinks.mutationOptions({ onSuccess: refreshLinks }))
  const addTagsMutation = useMutation(orpc.links.addLinkTags.mutationOptions({ onSuccess: refreshLinks }))
  const deleteLinksMutation = useMutation(orpc.links.deleteLinks.mutationOptions({ onSuccess: refreshLinks }))

  /** Saves part of a link; fields left out keep their value. */
  const updateLink$ = (linkId: string, body: UpdateLinkBody) =>
    updateLinkMutation.mutateAsync({ params: { organizationId: orgId, linkId }, body })

  const createLink = useCallback(
    async (draft: CreateLinkDraft, previewImage?: File | null) => {
      const first = Object.values(validateDraft(draft, { links }))[0]
      if (first) throw new Error(first)
      requireFolder(draft.folderId)

      let slug = draft.slug.trim()
      while (!slug || isSlugTaken(links, draft.domainId, slug)) slug = generateSlug()

      const body = draftToCreateBody(draft, slug)
      // A file makes the client send multipart; the server stores it as the card's image.
      return createLinkMutation.mutateAsync({ params: { organizationId: orgId }, body: previewImage ? { ...body, previewImage } : body })
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

  const setLinkPreviewImage = useCallback(
    // Only the image: a form body can't carry the nulls a full save uses to clear settings.
    (linkId: string, image: File) => updateLink$(linkId, { previewImage: image }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orgId],
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

  return {
    createLink,
    updateLink,
    setLinkPreviewImage,
    duplicateLink,
    moveLinks,
    moveLink,
    setLinksHold,
    setLinkHold,
    saveLinkNotes,
    addTagsToLinks,
    deleteLinks,
    deleteLink,
  }
}
