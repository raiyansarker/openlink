import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { organization, organizationMember, user } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import type { WorkerBindings } from '#/server/env'
import { Bindings } from '#/server/effect/services/bindings'
import { Db } from '#/server/effect/services/db'
import { FakeBucket, IMAGES } from '#/server/media/test-support'
import { createTestDatabase } from '#/server/testing/sqlite'

import { createWorkspace, suggestWorkspaceSlug, updateWorkspace } from './workspace'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date()
  adapter.insert(user).values({ id: 'u1', name: 'Ada', email: 'ada@e.test', createdAt: now, updatedAt: now }).run()
  adapter.insert(organization).values({ id: 'o1', name: 'Acme', slug: 'acme', createdAt: now, updatedAt: now }).run()
  const bucket = new FakeBucket()
  const provide = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) =>
    effect.pipe(
      Effect.provideService(Db, db),
      Effect.provideService(Bindings, { MEDIA: bucket } as unknown as WorkerBindings),
    )
  const run = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) => Effect.runPromise(provide(effect))
  const flip = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) => Effect.runPromise(Effect.flip(provide(effect)))
  const org = (id: string) => adapter.select().from(organization).where(eq(organization.id, id)).get()
  const organizations = () => adapter.select().from(organization).all()
  return { run, flip, bucket, org, organizations, adapter }
}

const image = (bytes: Uint8Array, type = 'image/webp') => new Blob([bytes], { type })

describe('a generated workspace URL', () => {
  test('is the name as a slug when it is free', async () => {
    const t = setup()
    const created = await t.run(createWorkspace({ userId: 'u1', name: "Raiyan's workspace" }))
    expect(created.slug).toBe('raiyans-workspace')
  })

  test('gets a random suffix when the plain one is taken, every time', async () => {
    const t = setup()
    const first = await t.run(createWorkspace({ userId: 'u1', name: 'Acme' }))
    const second = await t.run(createWorkspace({ userId: 'u1', name: 'Acme' }))
    expect(first.slug).toMatch(/^acme-[a-z0-9]{5}$/)
    expect(second.slug).toMatch(/^acme-[a-z0-9]{5}$/)
    expect(second.slug).not.toBe(first.slug)
  })

  test('a name with no usable letters becomes "workspace"', async () => {
    const t = setup()
    expect((await t.run(createWorkspace({ userId: 'u1', name: '📎' }))).slug).toBe('workspace')
  })

  test('the suggestion is the plain slug when free, a suffixed one when taken', async () => {
    const t = setup()
    expect(await t.run(suggestWorkspaceSlug("Raiyan's workspace"))).toBe('raiyans-workspace')
    // 'acme' belongs to the seeded workspace.
    expect(await t.run(suggestWorkspaceSlug('Acme'))).toMatch(/^acme-[a-z0-9]{5}$/)
  })

  test('a chosen slug that is taken is a conflict, not a generated one', async () => {
    const t = setup()
    expect(await t.flip(createWorkspace({ userId: 'u1', name: 'Acme', slug: 'acme' }))).toMatchObject({ _tag: 'OrganizationConflict' })
  })
})

describe('creating a workspace with its logo', () => {
  test('stores the image and saves its key on the new workspace, with its owner', async () => {
    const t = setup()
    const created = await t.run(createWorkspace({ userId: 'u1', name: 'Beta', slug: 'beta', logo: image(IMAGES.webp) }))
    expect(created.logoKey).toMatch(new RegExp(`^logos/${created.id}/.+\\.webp$`))
    expect([...t.bucket.objects.keys()]).toEqual([created.logoKey!])
    const owner = t.adapter.select().from(organizationMember).where(eq(organizationMember.organizationId, created.id)).get()
    expect(owner).toMatchObject({ userId: 'u1', role: 'owner' })
  })

  test('if the workspace cannot be created, the stored image is deleted again', async () => {
    const t = setup()
    const error = await t.flip(createWorkspace({ userId: 'u1', name: 'Dup', slug: 'acme', logo: image(IMAGES.png) }))
    expect(error).toMatchObject({ _tag: 'OrganizationConflict' })
    expect(t.bucket.objects.size).toBe(0)
    expect(t.organizations()).toHaveLength(1)
  })

  test('a file that is not an image creates nothing', async () => {
    const t = setup()
    const error = await t.flip(createWorkspace({ userId: 'u1', name: 'Beta', slug: 'beta', logo: image(new Uint8Array(32), 'image/png') }))
    expect(error).toMatchObject({ _tag: 'UploadRejected', status: 415 })
    expect(t.bucket.objects.size).toBe(0)
    expect(t.organizations()).toHaveLength(1)
  })
})

describe('updating a workspace logo', () => {
  test('replacing the logo deletes the old image once the new key is saved', async () => {
    const t = setup()
    const first = await t.run(updateWorkspace({ organizationId: 'o1', logo: image(IMAGES.png) }))
    const second = await t.run(updateWorkspace({ organizationId: 'o1', logo: image(IMAGES.webp) }))
    expect(second).toMatchObject({ logoChanged: true, before: { logoKey: first!.after.logoKey } })
    expect([...t.bucket.objects.keys()]).toEqual([t.org('o1')!.logoKey!])
  })

  test('null removes the logo and its image', async () => {
    const t = setup()
    await t.run(updateWorkspace({ organizationId: 'o1', logo: image(IMAGES.png) }))
    const removed = await t.run(updateWorkspace({ organizationId: 'o1', logo: null }))
    expect(removed).toMatchObject({ logoChanged: true, after: { logoKey: null } })
    expect(t.bucket.objects.size).toBe(0)
  })

  test('a failed save deletes the new image and keeps the old logo', async () => {
    const t = setup()
    const now = new Date()
    t.adapter.insert(organization).values({ id: 'o2', name: 'Taken', slug: 'taken', createdAt: now, updatedAt: now }).run()
    const kept = (await t.run(updateWorkspace({ organizationId: 'o1', logo: image(IMAGES.png) })))!.after.logoKey
    const error = await t.flip(updateWorkspace({ organizationId: 'o1', slug: 'taken', logo: image(IMAGES.webp) }))
    expect(error).toMatchObject({ _tag: 'OrganizationConflict' })
    expect(t.org('o1')!.logoKey).toBe(kept)
    expect([...t.bucket.objects.keys()]).toEqual([kept!])
  })

  test('leaving the logo out keeps it; a missing workspace stores nothing', async () => {
    const t = setup()
    const kept = (await t.run(updateWorkspace({ organizationId: 'o1', logo: image(IMAGES.png) })))!.after.logoKey
    const renamed = await t.run(updateWorkspace({ organizationId: 'o1', name: 'Acme Inc' }))
    expect(renamed).toMatchObject({ logoChanged: false, after: { name: 'Acme Inc', logoKey: kept } })
    expect(await t.run(updateWorkspace({ organizationId: 'missing', logo: image(IMAGES.png) }))).toBeNull()
    expect([...t.bucket.objects.keys()]).toEqual([kept!])
  })
})
