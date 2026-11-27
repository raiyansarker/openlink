import type { SocialPreview } from '@openlink/contracts'
import { link } from '@openlink/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'
import { MediaKey } from '#/server/media/media-key'
import { MediaStore } from '#/server/media/media-store'
import { MediaUploads } from '#/server/media/uploads'

import { LinkDelivery } from './delivery'

/** A share-card image path that belongs to another workspace. */
export class ForeignPreviewImage extends Data.TaggedError('ForeignPreviewImage')<{}> {}

/**
 * Share-card images we store for links, under `previews/<workspace>/`. Duplicated links can
 * share one image, so a stored image is deleted only when no link of the workspace uses it.
 */
export class LinkPreviewImages {
  /** Check and store an image sent with a link; resolves to the URL to save as `socialPreview.imageUrl`. */
  static store(organizationId: string, file: Blob) {
    return MediaUploads.storeImage('previews', organizationId, file, MediaUploads.MAX_PREVIEW_BYTES).pipe(Effect.map(MediaKey.toUrl))
  }

  /** Delete an image stored by `store` that was never saved on a link (the save failed). */
  static discard(url: string | null) {
    return MediaStore.removeQuietly(MediaKey.fromUrl(url))
  }

  /**
   * The share card to save when a request sends `previewImage`: a stored URL replaces the image,
   * null removes it, undefined leaves `socialPreview` as the request has it.
   * `current` is what the link has now (used when the request doesn't send `socialPreview`).
   */
  static withImage(
    requested: SocialPreview | null | undefined,
    current: SocialPreview | undefined,
    image: string | null | undefined,
  ): SocialPreview | null | undefined {
    if (image === undefined) return requested
    const base = requested === undefined ? current : requested
    if (image) return { ...base, imageUrl: image }
    if (!base) return requested === undefined ? undefined : null
    const { imageUrl: _removed, ...rest } = base
    return Object.keys(rest).length > 0 ? rest : null
  }

  /** Our own image paths are only accepted for the workspace that stored them. */
  static checkOwned(organizationId: string, preview: SocialPreview | null | undefined) {
    const key = MediaKey.fromUrl(preview?.imageUrl)
    return key && !key.startsWith(`previews/${organizationId}/`) ? Effect.fail(new ForeignPreviewImage()) : Effect.void
  }

  static urlOf(deliveryJson: string | null | undefined): string | null {
    return LinkDelivery.fromJson(deliveryJson).socialPreview?.imageUrl ?? null
  }

  /** The share-card images of some links, read before they are deleted. */
  static urlsOf(organizationId: string, linkIds: readonly string[]) {
    return Effect.gen(function* () {
      if (linkIds.length === 0) return [] as string[]
      const db = yield* Db
      const ids = [...new Set(linkIds)]
      const urls = new Set<string>()
      // D1 allows 100 bound parameters per statement.
      for (let start = 0; start < ids.length; start += 80) {
        const chunk = ids.slice(start, start + 80)
        const rows = yield* operation('links.previewImages.read', () =>
          db.select({ deliveryJson: link.deliveryJson }).from(link).where(and(eq(link.organizationId, organizationId), inArray(link.id, chunk))),
        )
        for (const row of rows) {
          const url = LinkPreviewImages.urlOf(row.deliveryJson)
          if (url) urls.add(url)
        }
      }
      return [...urls]
    })
  }

  /** Delete our stored image once no link of the workspace uses it. External images are left alone. */
  static releaseIfUnused(organizationId: string, url: string | null) {
    return Effect.gen(function* () {
      const key = MediaKey.fromUrl(url)
      if (!key || !key.startsWith(`previews/${organizationId}/`)) return
      const db = yield* Db
      const [used] = yield* operation('links.previewImages.inUse', () =>
        db
          .select({ id: link.id })
          .from(link)
          .where(and(eq(link.organizationId, organizationId), sql`instr(${link.deliveryJson}, ${url}) > 0`))
          .limit(1),
      )
      if (!used) yield* MediaStore.removeQuietly(key)
    }).pipe(Effect.catch((error) => Effect.logWarning(`links.previewImages: could not release ${url}: ${String(error)}`)))
  }
}
