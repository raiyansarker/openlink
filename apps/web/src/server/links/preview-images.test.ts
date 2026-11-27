import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { link, organization } from '@openlink/db/schema'
import { Effect } from 'effect'

import type { WorkerBindings } from '#/server/env'
import { Bindings } from '#/server/effect/services/bindings'
import { Db } from '#/server/effect/services/db'
import { MediaKey } from '#/server/media/media-key'
import { FakeBucket, IMAGES } from '#/server/media/test-support'
import { createTestDatabase } from '#/server/testing/sqlite'

import { LinkPreviewImages } from './preview-images'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date()
  adapter.insert(organization).values([
    { id: 'o1', name: 'Acme', slug: 'acme', createdAt: now, updatedAt: now },
    { id: 'o2', name: 'Other', slug: 'other', createdAt: now, updatedAt: now },
  ]).run()
  const bucket = new FakeBucket()
  const provide = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) =>
    effect.pipe(Effect.provideService(Db, db), Effect.provideService(Bindings, { MEDIA: bucket } as unknown as WorkerBindings))
  const run = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) => Effect.runPromise(provide(effect))
  const flip = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) => Effect.runPromise(Effect.flip(provide(effect)))
  let n = 0
  const linkWith = (organizationId: string, imageUrl: string | null) => {
    const id = `l${++n}`
    adapter.insert(link).values({
      id, organizationId, domainId: null, slug: id, destinationUrl: 'https://example.com', status: 'active',
      enabled: true, clickCount: 0, tagsJson: '[]', createdAt: now, updatedAt: now,
      deliveryJson: imageUrl ? JSON.stringify({ socialPreview: { title: 'Card', imageUrl } }) : null,
    } as never).run()
    return id
  }
  const deleteLink = (id: string) => sqlite.run('DELETE FROM link WHERE id = ?', [id])
  return { run, flip, bucket, linkWith, deleteLink }
}

const png = () => new Blob([IMAGES.png], { type: 'image/png' })

describe('LinkPreviewImages', () => {
  test('stores an image under the workspace and returns the URL a link saves', async () => {
    const t = setup()
    const url = await t.run(LinkPreviewImages.store('o1', png()))
    expect(MediaKey.fromUrl(url)).toMatch(/^previews\/o1\/.+\.png$/)
    expect(t.bucket.objects.size).toBe(1)
  })

  test('a file that is not an image is refused before anything is stored', async () => {
    const t = setup()
    const error = await t.flip(LinkPreviewImages.store('o1', new Blob([new Uint8Array(40)], { type: 'image/png' })))
    expect(error).toMatchObject({ _tag: 'UploadRejected', status: 415 })
    expect(t.bucket.objects.size).toBe(0)
  })

  test('an image shared by duplicated links is deleted only when the last one lets go', async () => {
    const t = setup()
    const url = await t.run(LinkPreviewImages.store('o1', png()))
    const first = t.linkWith('o1', url)
    const copy = t.linkWith('o1', url)
    t.deleteLink(first)
    await t.run(LinkPreviewImages.releaseIfUnused('o1', url))
    expect(t.bucket.objects.size).toBe(1)
    t.deleteLink(copy)
    await t.run(LinkPreviewImages.releaseIfUnused('o1', url))
    expect(t.bucket.objects.size).toBe(0)
  })

  test("external images and other workspaces' images are never deleted", async () => {
    const t = setup()
    const theirs = await t.run(LinkPreviewImages.store('o2', png()))
    await t.run(LinkPreviewImages.releaseIfUnused('o1', theirs))
    await t.run(LinkPreviewImages.releaseIfUnused('o1', 'https://cdn.example.com/card.png'))
    expect(t.bucket.objects.size).toBe(1)
  })

  test("a link may not point at another workspace's stored image", async () => {
    const t = setup()
    expect(await t.flip(LinkPreviewImages.checkOwned('o1', { imageUrl: '/api/media/previews/o2/abc.png' }))).toMatchObject({ _tag: 'ForeignPreviewImage' })
    await t.run(LinkPreviewImages.checkOwned('o1', { imageUrl: '/api/media/previews/o1/abc.png' }))
    await t.run(LinkPreviewImages.checkOwned('o1', { imageUrl: 'https://cdn.example.com/card.png' }))
  })

  test('reads the images of links about to be deleted, once each', async () => {
    const t = setup()
    const url = await t.run(LinkPreviewImages.store('o1', png()))
    const ids = [t.linkWith('o1', url), t.linkWith('o1', url), t.linkWith('o1', null), t.linkWith('o2', '/api/media/previews/o2/x.png')]
    expect(await t.run(LinkPreviewImages.urlsOf('o1', ids))).toEqual([url])
  })
})

describe('LinkPreviewImages.withImage', () => {
  const current = { title: 'Card', imageUrl: '/api/media/previews/o1/old.png' }

  test('a new image replaces the one the link has, keeping the rest of the card', () => {
    expect(LinkPreviewImages.withImage(undefined, current, '/api/media/previews/o1/new.png')).toEqual({ title: 'Card', imageUrl: '/api/media/previews/o1/new.png' })
    expect(LinkPreviewImages.withImage({ title: 'Edited' }, current, '/x/new.png')).toEqual({ title: 'Edited', imageUrl: '/x/new.png' })
    expect(LinkPreviewImages.withImage(null, current, '/x/new.png')).toEqual({ imageUrl: '/x/new.png' })
  })

  test('null removes only the image; a card left empty is removed', () => {
    expect(LinkPreviewImages.withImage(undefined, current, null)).toEqual({ title: 'Card' })
    expect(LinkPreviewImages.withImage(undefined, { imageUrl: '/x.png' }, null)).toBeNull()
    expect(LinkPreviewImages.withImage(undefined, undefined, null)).toBeUndefined()
  })

  test('no image in the request leaves the card as sent', () => {
    expect(LinkPreviewImages.withImage({ title: 'T' }, current, undefined)).toEqual({ title: 'T' })
    expect(LinkPreviewImages.withImage(undefined, current, undefined)).toBeUndefined()
  })
})
