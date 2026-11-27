import { Effect } from 'effect'
import { ReservedSlugs } from '@openlink/contracts'

import { FrameCheck } from '#/server/redirect/frame-check'
import { toActivityDto, toLinkDto } from '#/server/api/serializers'
import { requireLinkWriterEffect, requireOrgMemberEffect } from '#/server/effect/access'
import { principalUserId } from '#/server/effect/principal'
import { ensureFolderInOrganization } from '#/server/folders/service'
import { audit } from '#/server/activity/audit'
import { diffLink, linkUpdateAction } from '#/server/activity/actions'
import { LinkHistory, type LinkHistoryKind } from '#/server/activity/link-history'
import { isAdmin } from '#/server/org/permissions'
import { os } from '#/server/orpc/implement'
import { notFound } from '#/server/orpc/errors'
import { requireDomain } from '#/server/domain/guards'
import type { MessageError } from '#/server/orpc/errors'

import { addTagsToLinks, deleteLinks, moveLinks } from './bulk'
import { queryOrganizationLinks } from './queries'
import {
  createLinkRecord,
  deleteLinkRecord,
  getLinkInOrganization,
  listLinksForDomain,
  updateLinkRecord,
} from './service'
import { requireLink } from './guards'
import { LinkDelivery } from './delivery'
import { LinkPreviewImages } from './preview-images'

/**
 * Runs a link save with the share-card image sent in the same request. The image is stored
 * first, because the link holds its URL; if the save fails, the stored image is deleted again.
 * `image` given to `save`: the stored URL, null to remove the image, undefined when none was sent.
 */
function withPreviewImage<A, E, R>(organizationId: string, file: Blob | null | undefined, save: (image: string | null | undefined) => Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    const image = file ? yield* LinkPreviewImages.store(organizationId, file) : file
    return yield* save(image).pipe(Effect.onError(() => LinkPreviewImages.discard(typeof image === 'string' ? image : null)))
  })
}

/** Errors from the share-card image, as API errors. */
const onPreviewImageErrors = (errors: { BAD_REQUEST: MessageError }) => ({
  UploadRejected: (error: { message: string }) => Effect.fail(errors.BAD_REQUEST({ message: error.message })),
  ForeignPreviewImage: () => Effect.fail(errors.BAD_REQUEST({ message: 'That share image belongs to another workspace.' })),
})

/** Create a link, with its share-card image if one was sent. */
function createWithPreviewImage(
  organizationId: string,
  body: Omit<Parameters<typeof createLinkRecord>[0], 'organizationId' | 'socialPreview'> & { socialPreview?: Parameters<typeof createLinkRecord>[0]['socialPreview']; previewImage?: Blob },
) {
  const { previewImage, ...fields } = body
  return Effect.gen(function* () {
    yield* LinkPreviewImages.checkOwned(organizationId, fields.socialPreview)
    return yield* withPreviewImage(organizationId, previewImage, (image) => {
      const socialPreview = LinkPreviewImages.withImage(fields.socialPreview, undefined, image) ?? undefined
      return createLinkRecord({ ...fields, organizationId, ...(socialPreview ? { socialPreview } : {}) })
    })
  })
}

/** Update a link, replacing or removing its share-card image if asked; the old image goes once unused. */
function updateWithPreviewImage(
  organizationId: string,
  existing: Parameters<typeof updateLinkRecord>[0],
  body: Parameters<typeof updateLinkRecord>[1] & { previewImage?: Blob | null },
) {
  const { previewImage, ...fields } = body
  return Effect.gen(function* () {
    yield* LinkPreviewImages.checkOwned(organizationId, fields.socialPreview)
    const updated = yield* withPreviewImage(organizationId, previewImage, (image) => {
      const socialPreview = LinkPreviewImages.withImage(fields.socialPreview, LinkDelivery.fromJson(existing.deliveryJson).socialPreview, image)
      return updateLinkRecord(existing, { ...fields, ...(socialPreview !== undefined ? { socialPreview } : {}) })
    })
    const before = LinkPreviewImages.urlOf(existing.deliveryJson)
    if (before !== LinkPreviewImages.urlOf(updated.deliveryJson)) yield* LinkPreviewImages.releaseIfUnused(organizationId, before)
    return updated
  })
}

/** A link addressed by workspace and link id, optionally pinned to a domain. */
type LinkAddress = { organizationId: string; linkId: string; domainId?: string }

/**
 * A link's history. Served at both the per-domain paths and
 * the workspace paths (which also reach links on the app's own host).
 */
class LinkHistoryRoutes {
  static locate(address: LinkAddress) {
    return Effect.gen(function* () {
      if (address.domainId) return yield* requireLink(address.organizationId, address.domainId, address.linkId)
      const row = yield* getLinkInOrganization(address.organizationId, address.linkId)
      if (!row) return yield* Effect.fail(notFound('Link not found'))
      return row
    })
  }

  static history(address: LinkAddress, query: { kind?: LinkHistoryKind; limit?: number; cursor?: string }) {
    return Effect.gen(function* () {
      const { membership } = yield* requireOrgMemberEffect(address.organizationId)
      yield* LinkHistoryRoutes.locate(address)
      const { items, nextCursor } = yield* LinkHistory.page({ organizationId: address.organizationId, linkId: address.linkId, ...query })
      // Totals only with the first page; later pages don't change them.
      const summary = query.cursor ? undefined : yield* LinkHistory.summary(address.organizationId, address.linkId)
      return {
        items: items.map((row) => toActivityDto(row, { includeIp: isAdmin(membership.role) })),
        ...(nextCursor ? { nextCursor } : {}),
        ...(summary ? { summary } : {}),
      }
    })
  }
}

/** A link may only be filed into a folder of its own workspace. */
const requireLinkFolder = (
  organizationId: string,
  folderId: string | null | undefined,
  errors: { BAD_REQUEST: MessageError },
) =>
  folderId
    ? ensureFolderInOrganization(organizationId, folderId).pipe(
        Effect.catchTags({ FolderNotFound: () => Effect.fail(errors.BAD_REQUEST({ message: 'Folder not found' })) }),
      )
    : Effect.void

export const linksController = {
  listOrganizationLinks: os.links.listOrganizationLinks.effect(function* ({ input }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    const { items, total } = yield* queryOrganizationLinks({
      organizationId: input.params.organizationId,
      ...input.query,
    })
    return { items: items.map(toLinkDto), total }
  }),

  moveLinks: os.links.moveLinks.effect(function* ({ input, errors }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
    const affected = yield* moveLinks({ organizationId: input.params.organizationId, ...input.body })
    if (affected > 0) {
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'link.moved',
        target: { type: 'links', label: `${affected} link${affected === 1 ? '' : 's'}` },
      })
    }
    return { affected }
  }),

  addLinkTags: os.links.addLinkTags.effect(function* ({ input }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    const affected = yield* addTagsToLinks({ organizationId: input.params.organizationId, ...input.body })
    if (affected > 0) {
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'link.tagged',
        target: { type: 'links', label: `${affected} link${affected === 1 ? '' : 's'}` },
        changes: [{ label: 'Tags added', from: '—', to: input.body.tags.join(', ') }],
      })
    }
    return { affected }
  }),

  deleteLinks: os.links.deleteLinks.effect(function* ({ input }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    const images = yield* LinkPreviewImages.urlsOf(input.params.organizationId, input.body.linkIds)
    const affected = yield* deleteLinks({ organizationId: input.params.organizationId, ...input.body })
    for (const url of images) yield* LinkPreviewImages.releaseIfUnused(input.params.organizationId, url)
    if (affected > 0) {
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'link.deleted',
        target: { type: 'links', label: `${affected} link${affected === 1 ? '' : 's'}` },
      })
    }
    return { affected }
  }),

  checkFraming: os.links.checkFraming.effect(function* ({ input }) {
    // Only people who can edit links can make the server fetch a URL.
    yield* requireLinkWriterEffect(input.params.organizationId)
    return { frameable: yield* FrameCheck.frameable(input.body.url) }
  }),

  createWorkspaceLink: os.links.createWorkspaceLink.effect(function* ({ input, errors }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    const domainId = input.body.domainId ?? null
    if (domainId) yield* requireDomain(input.params.organizationId, domainId)
    // On the app host, a slug must not shadow an app page.
    if (!domainId && input.body.slug && ReservedSlugs.isReserved(input.body.slug)) {
      return yield* Effect.fail(errors.BAD_REQUEST({ message: `“${input.body.slug}” is reserved. Choose another back-half.` }))
    }
    yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
    const { domainId: _ignored, ...body } = input.body
    const row = yield* createWithPreviewImage(input.params.organizationId, {
      ...body,
      domainId,
      userId: principalUserId(session),
      activateAt: body.activateAt ? new Date(body.activateAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    }).pipe(Effect.catchTags({
      ...onPreviewImageErrors(errors),
      SlugConflict: () => Effect.fail(errors.CONFLICT({ message: 'That back-half is already taken' })),
      BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to create link' })),
    }))
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'link.created',
      target: { type: 'link', id: row.id, label: row.title || row.slug },
    })
    return toLinkDto(row)
  }),

  getWorkspaceLink: os.links.getWorkspaceLink.effect(function* ({ input, errors }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    const row = yield* getLinkInOrganization(input.params.organizationId, input.params.linkId)
    if (!row) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Link not found' }))
    return toLinkDto(row)
  }),

  updateWorkspaceLink: os.links.updateWorkspaceLink.effect(function* ({ input, errors }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
    const existing = yield* getLinkInOrganization(input.params.organizationId, input.params.linkId)
    if (!existing) return yield* Effect.fail(errors.NOT_FOUND({ message: 'Link not found' }))
    const updated = yield* updateWithPreviewImage(input.params.organizationId, existing, input.body).pipe(
      Effect.catchTags(onPreviewImageErrors(errors)),
    )
    const changes = diffLink(existing, updated)
    if (changes.length > 0) {
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: linkUpdateAction(changes),
        target: { type: 'link', id: updated.id, label: updated.title || updated.slug },
        changes,
      })
    }
    return toLinkDto(updated)
  }),

  listLinks: os.links.listLinks.effect(function* ({ input }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    yield* requireDomain(input.params.organizationId, input.params.domainId)
    const rows = yield* listLinksForDomain(input.params.domainId)
    return { items: rows.map(toLinkDto) }
  }),

  createLink: os.links.createLink.effect(function* ({ input, errors }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    yield* requireDomain(input.params.organizationId, input.params.domainId)
    yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
    const { domainId: _fromBody, ...linkBody } = input.body
    const row = yield* createWithPreviewImage(input.params.organizationId, {
      ...linkBody,
      domainId: input.params.domainId,
      userId: principalUserId(session),
      activateAt: input.body.activateAt ? new Date(input.body.activateAt) : undefined,
      expiresAt: input.body.expiresAt ? new Date(input.body.expiresAt) : undefined,
    }).pipe(Effect.catchTags({
      ...onPreviewImageErrors(errors),
      SlugConflict: () => Effect.fail(errors.CONFLICT({ message: 'Slug already exists on this domain' })),
      BackendError: () => Effect.fail(errors.BAD_REQUEST({ message: 'Unable to create link' })),
    }))
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'link.created',
      target: { type: 'link', id: row.id, label: row.title || row.slug },
    })
    return toLinkDto(row)
  }),

  getLink: os.links.getLink.effect(function* ({ input }) {
    yield* requireOrgMemberEffect(input.params.organizationId)
    return toLinkDto(yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId))
  }),

  updateLink: os.links.updateLink.effect(function* ({ input, errors }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    yield* requireLinkFolder(input.params.organizationId, input.body.folderId, errors)
    const existing = yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
    const updated = yield* updateWithPreviewImage(input.params.organizationId, existing, input.body).pipe(
      Effect.catchTags(onPreviewImageErrors(errors)),
    )
    const changes = diffLink(existing, updated)
    if (changes.length > 0) {
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: linkUpdateAction(changes),
        target: { type: 'link', id: updated.id, label: updated.title || updated.slug },
        changes,
      })
    }
    return toLinkDto(updated)
  }),

  deleteLink: os.links.deleteLink.effect(function* ({ input }) {
    const { session } = yield* requireLinkWriterEffect(input.params.organizationId)
    const existing = yield* requireLink(input.params.organizationId, input.params.domainId, input.params.linkId)
    yield* deleteLinkRecord(input.params.linkId)
    yield* LinkPreviewImages.releaseIfUnused(input.params.organizationId, LinkPreviewImages.urlOf(existing.deliveryJson))
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'link.deleted',
      target: { type: 'link', id: existing.id, label: existing.title || existing.slug },
    })
    return {}
  }),

  getLinkHistory: os.links.getLinkHistory.effect(function* ({ input }) {
    return yield* LinkHistoryRoutes.history(input.params, input.query)
  }),
  getWorkspaceLinkHistory: os.links.getWorkspaceLinkHistory.effect(function* ({ input }) {
    return yield* LinkHistoryRoutes.history(input.params, input.query)
  }),
}
