import { organization } from '@openlink/db/schema'
import { inArray } from 'drizzle-orm'
import { Data, Effect } from 'effect'

import { operation } from '#/server/effect/operations'
import { Db } from '#/server/effect/services/db'

import { workspaceSlugBase, withRandomSuffix } from '#/lib/organization/default-workspace'
import { MediaStore } from '#/server/media/media-store'
import { MediaUploads } from '#/server/media/uploads'

import { updateOrganization } from './members'
import { OrganizationConflict } from './errors'
import { createOrganizationForUser, getOrganizationById } from './service'

/** The workspace was deleted between reading and saving it. */
class WorkspaceGone extends Data.TaggedError('WorkspaceGone')<{}> {}

/** Check and store a logo sent with the request; null when none was sent. */
const storeLogo = (organizationId: string, logo: Blob | null | undefined) =>
  logo ? MediaUploads.storeImage('logos', organizationId, logo) : Effect.succeed(null)

/**
 * A workspace URL that is free right now, for the create form to prefill: the name as a
 * slug, or that with a random suffix. One query checks every candidate. Someone else can
 * still take it before the form is sent; the form then asks again.
 */
export function suggestWorkspaceSlug(name: string) {
  return Effect.gen(function* () {
    const db = yield* Db
    const base = workspaceSlugBase(name)
    const candidates = [base, ...Array.from({ length: GENERATED_SLUG_ATTEMPTS - 1 }, () => withRandomSuffix(base))]
    const taken = yield* operation('org.suggestSlug', () =>
      db.select({ slug: organization.slug }).from(organization).where(inArray(organization.slug, candidates)),
    )
    const used = new Set(taken.map((row) => row.slug))
    return candidates.find((slug) => !used.has(slug)) ?? withRandomSuffix(base)
  })
}

/** Generated URLs tried before giving up: the plain one, then random suffixes. */
const GENERATED_SLUG_ATTEMPTS = 6

/**
 * Create a workspace together with its logo. The image is checked and stored first,
 * because the row holds its key; if the workspace is then not created, the image is
 * deleted again. The caller gets both or neither.
 *
 * Without a `slug`, the URL is generated from the name: `raiyans-workspace`, or with a
 * random suffix (`raiyans-workspace-k3x9q`) when that is taken. The database's unique
 * index decides, so two people creating workspaces at once never get the same URL.
 */
export function createWorkspace(input: { userId: string; name: string; slug?: string | undefined; logo?: Blob | undefined }) {
  return Effect.gen(function* () {
    const id = crypto.randomUUID()
    const logoKey = yield* storeLogo(id, input.logo)
    const create = (slug: string) => createOrganizationForUser({ id, userId: input.userId, name: input.name, slug, logoKey })

    const attempt = (n: number): ReturnType<typeof create> => {
      if (input.slug) return create(input.slug)
      const base = workspaceSlugBase(input.name)
      return create(n === 0 ? base : withRandomSuffix(base)).pipe(
        Effect.catchTag('OrganizationConflict', (conflict) =>
          n + 1 < GENERATED_SLUG_ATTEMPTS ? attempt(n + 1) : Effect.fail<OrganizationConflict>(conflict),
        ),
      )
    }
    return yield* attempt(0).pipe(Effect.onError(() => MediaStore.removeQuietly(logoKey)))
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
