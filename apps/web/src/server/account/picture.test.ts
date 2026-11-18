import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { user } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import type { WorkerBindings } from '#/server/env'
import { Bindings } from '#/server/effect/services/bindings'
import { Db } from '#/server/effect/services/db'
import { MediaKey } from '#/server/media/media-key'
import { FakeBucket, IMAGES } from '#/server/media/test-support'
import { MediaUploads } from '#/server/media/uploads'
import { createTestDatabase } from '#/server/testing/sqlite'

import { ProfilePicture } from './picture'

const PROVIDER_PICTURE = 'https://avatars.githubusercontent.com/u/1'

const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup() {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date()
  adapter.insert(user).values({ id: 'u1', name: 'Ada', email: 'ada@e.test', image: PROVIDER_PICTURE, createdAt: now, updatedAt: now }).run()
  const bucket = new FakeBucket()
  const provide = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) =>
    effect.pipe(Effect.provideService(Db, db), Effect.provideService(Bindings, { MEDIA: bucket } as unknown as WorkerBindings))
  const run = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) => Effect.runPromise(provide(effect))
  const flip = <A, E>(effect: Effect.Effect<A, E, Db | Bindings>) => Effect.runPromise(Effect.flip(provide(effect)))
  const imageOf = () => adapter.select().from(user).where(eq(user.id, 'u1')).get()?.image
  return { run, flip, bucket, imageOf, sqlite }
}

const image = (bytes: Uint8Array, type = 'image/webp') => new Blob([bytes], { type })

describe('ProfilePicture', () => {
  test('stores the image and points the profile at it; a provider picture is left alone', async () => {
    const t = setup()
    const url = await t.run(ProfilePicture.replace('u1', image(IMAGES.webp)))
    const key = MediaKey.fromUrl(url)!
    expect(key).toMatch(/^avatars\/u1\/.+\.webp$/)
    expect(t.bucket.objects.get(key)?.contentType).toBe('image/webp')
    expect(t.imageOf()).toBe(url)
    expect(t.bucket.objects.size).toBe(1)
  })

  test('replacing a picture deletes the previous one once the profile points at the new one', async () => {
    const t = setup()
    const first = await t.run(ProfilePicture.replace('u1', image(IMAGES.png, 'image/png')))
    const second = await t.run(ProfilePicture.replace('u1', image(IMAGES.webp)))
    expect(second).not.toBe(first)
    expect([...t.bucket.objects.keys()]).toEqual([MediaKey.fromUrl(second)])
  })

  test('removing clears the profile and deletes the stored image', async () => {
    const t = setup()
    await t.run(ProfilePicture.replace('u1', image(IMAGES.webp)))
    await t.run(ProfilePicture.remove('u1'))
    expect(t.imageOf()).toBeNull()
    expect(t.bucket.objects.size).toBe(0)
  })

  test('the file must really be an image, whatever its declared type', async () => {
    const t = setup()
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    const error = await t.flip(ProfilePicture.replace('u1', image(svg, 'image/png')))
    expect(error).toMatchObject({ _tag: 'UploadRejected', status: 415 })
    expect(t.bucket.objects.size).toBe(0)
    expect(t.imageOf()).toBe(PROVIDER_PICTURE)
  })

  test('oversized images are refused before anything is stored', async () => {
    const t = setup()
    const big = new Uint8Array(MediaUploads.MAX_BYTES + 1)
    big.set(IMAGES.png)
    expect(await t.flip(ProfilePicture.replace('u1', image(big, 'image/png')))).toMatchObject({ _tag: 'UploadRejected', status: 413 })
    expect(t.bucket.objects.size).toBe(0)
  })

  test('if the profile cannot be updated, the new image is deleted again and the old picture stays', async () => {
    const t = setup()
    t.sqlite.exec(`CREATE TRIGGER block_picture BEFORE UPDATE OF image ON user BEGIN SELECT RAISE(ABORT, 'blocked'); END`)
    const error = await t.flip(ProfilePicture.replace('u1', image(IMAGES.webp)))
    expect(error).toMatchObject({ _tag: 'BackendError', operation: 'profile.picture.save' })
    expect(t.bucket.objects.size).toBe(0)
    expect(t.imageOf()).toBe(PROVIDER_PICTURE)
  })
})
