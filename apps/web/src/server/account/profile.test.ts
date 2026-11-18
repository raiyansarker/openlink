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

import { Profile } from './profile'

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
  const row = () => adapter.select().from(user).where(eq(user.id, 'u1')).get()!
  return { run, flip, bucket, row, sqlite }
}

const image = (bytes: Uint8Array, type = 'image/webp') => new Blob([bytes], { type })

describe('Profile.update', () => {
  test('changes the name and the picture in one save', async () => {
    const t = setup()
    const saved = await t.run(Profile.update('u1', { name: '  Ada   Lovelace ', image: image(IMAGES.webp) }))
    expect(saved.name).toBe('Ada Lovelace')
    expect(MediaKey.fromUrl(saved.imageUrl)).toMatch(/^avatars\/u1\/.+\.webp$/)
    expect(t.row()).toMatchObject({ name: 'Ada Lovelace', image: saved.imageUrl })
    expect(t.bucket.objects.size).toBe(1)
  })

  test('a name alone keeps the picture; a provider picture is never deleted', async () => {
    const t = setup()
    expect(await t.run(Profile.update('u1', { name: 'Grace' }))).toEqual({ name: 'Grace', imageUrl: PROVIDER_PICTURE })
    await t.run(Profile.update('u1', { image: image(IMAGES.webp) }))
    expect(t.bucket.objects.size).toBe(1)
  })

  test('replacing a picture deletes the previous upload once the profile points at the new one', async () => {
    const t = setup()
    const first = (await t.run(Profile.update('u1', { image: image(IMAGES.png, 'image/png') }))).imageUrl
    const second = (await t.run(Profile.update('u1', { image: image(IMAGES.webp) }))).imageUrl
    expect(second).not.toBe(first)
    expect([...t.bucket.objects.keys()]).toEqual([MediaKey.fromUrl(second)])
  })

  test('null removes the picture and its stored image', async () => {
    const t = setup()
    await t.run(Profile.update('u1', { image: image(IMAGES.webp) }))
    expect(await t.run(Profile.update('u1', { image: null }))).toEqual({ name: 'Ada', imageUrl: null })
    expect(t.bucket.objects.size).toBe(0)
  })

  test('a bad name or a file that is not an image changes nothing', async () => {
    const t = setup()
    expect(await t.flip(Profile.update('u1', { name: '   ', image: image(IMAGES.webp) }))).toMatchObject({ _tag: 'ProfileFieldRejected' })
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    expect(await t.flip(Profile.update('u1', { name: 'Grace', image: image(svg, 'image/png') }))).toMatchObject({ _tag: 'UploadRejected', status: 415 })
    const big = new Uint8Array(MediaUploads.MAX_BYTES + 1)
    big.set(IMAGES.png)
    expect(await t.flip(Profile.update('u1', { image: image(big, 'image/png') }))).toMatchObject({ _tag: 'UploadRejected', status: 413 })
    expect(t.bucket.objects.size).toBe(0)
    expect(t.row()).toMatchObject({ name: 'Ada', image: PROVIDER_PICTURE })
  })

  test('if the save fails, the new image is deleted again and nothing changes', async () => {
    const t = setup()
    t.sqlite.exec(`CREATE TRIGGER block_profile BEFORE UPDATE ON user BEGIN SELECT RAISE(ABORT, 'blocked'); END`)
    const error = await t.flip(Profile.update('u1', { name: 'Grace', image: image(IMAGES.webp) }))
    expect(error).toMatchObject({ _tag: 'BackendError', operation: 'profile.save' })
    expect(t.bucket.objects.size).toBe(0)
    expect(t.row()).toMatchObject({ name: 'Ada', image: PROVIDER_PICTURE })
  })
})
