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
    const affected = yield* deleteLinks({ organizationId: input.params.organizationId, ...input.body })
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
    const row = yield* createLinkRecord({
      ...body,
      organizationId: input.params.organizationId,
      domainId,
      userId: principalUserId(session),
      activateAt: body.activateAt ? new Date(body.activateAt) : undefined,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    }).pipe(Effect.catchTags({
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
    const updated = yield* updateLinkRecord(existing, input.body)
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
    const row = yield* createLinkRecord({
      ...linkBody,
      organizationId: input.params.organizationId,
      domainId: input.params.domainId,
      userId: principalUserId(session),
      activateAt: input.body.activateAt ? new Date(input.body.activateAt) : undefined,
      expiresAt: input.body.expiresAt ? new Date(input.body.expiresAt) : undefined,
    }).pipe(Effect.catchTags({
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
    const updated = yield* updateLinkRecord(existing, input.body)
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
