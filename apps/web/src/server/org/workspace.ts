import { Data, Effect } from 'effect'

import { MediaStore } from '#/server/media/media-store'
import { MediaUploads } from '#/server/media/uploads'

import { updateOrganization } from './members'
import { createOrganizationForUser, getOrganizationById } from './service'

/** The workspace was deleted between reading and saving it. */
class WorkspaceGone extends Data.TaggedError('WorkspaceGone')<{}> {}

/** Check and store a logo sent with the request; null when none was sent. */
const storeLogo = (organizationId: string, logo: Blob | null | undefined) =>
  logo ? MediaUploads.storeImage('logos', organizationId, logo) : Effect.succeed(null)

/**
 * Create a workspace together with its logo. The image is checked and stored first,
 * because the row holds its key; if the workspace is then not created, the image is
 * deleted again. The caller gets both or neither.
 */
export function createWorkspace(input: { userId: string; name: string; slug: string; logo?: Blob | undefined }) {
  return Effect.gen(function* () {
    const id = crypto.randomUUID()
    const logoKey = yield* storeLogo(id, input.logo)
    return yield* createOrganizationForUser({ id, userId: input.userId, name: input.name, slug: input.slug, logoKey }).pipe(
      Effect.onError(() => MediaStore.removeQuietly(logoKey)),
    )
  })
}

/**
 * Rename a workspace, change its URL, and replace (`logo` is an image) or remove
 * (`logo: null`) its logo, in one save. A new image is deleted again if the save fails;
 * the old one is deleted only once the row no longer points at it.
 * Resolves to null when the workspace does not exist.
 */
export function updateWorkspace(input: { organizationId: string; name?: string; slug?: string; logo?: Blob | null }) {
  return Effect.gen(function* () {
    const before = yield* getOrganizationById(input.organizationId)
    if (!before) return null
    const newLogoKey = yield* storeLogo(input.organizationId, input.logo)
    const after = yield* updateOrganization({
      organizationId: input.organizationId,
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.logo !== undefined ? { logoKey: newLogoKey } : {}),
    }).pipe(
      Effect.flatMap((row) => (row ? Effect.succeed(row) : Effect.fail(new WorkspaceGone()))),
      Effect.onError(() => MediaStore.removeQuietly(newLogoKey)),
      Effect.catchTag('WorkspaceGone', () => Effect.succeed(null)),
    )
    if (!after) return null
    const logoChanged = input.logo !== undefined && before.logoKey !== after.logoKey
    if (logoChanged) yield* MediaStore.removeQuietly(before.logoKey)
    return { before, after, logoChanged }
  })
}
