import { describe, expect, test } from 'bun:test'
import { Effect } from 'effect'

import type { WorkerBindings } from '#/server/env'
import { Bindings } from '#/server/effect/services/bindings'
import { ImageFormat } from './image-format'
import { MediaKey } from './media-key'
import { MediaNotFound, MediaStore } from './media-store'
import { FakeBucket, IMAGES } from './test-support'

describe('ImageFormat.detect', () => {
  test('recognises PNG, JPEG, GIF and WebP by their bytes', () => {
    expect(ImageFormat.detect(IMAGES.png)).toEqual({ mime: 'image/png', extension: 'png' })
    expect(ImageFormat.detect(IMAGES.jpeg)).toEqual({ mime: 'image/jpeg', extension: 'jpg' })
    expect(ImageFormat.detect(IMAGES.gif)).toEqual({ mime: 'image/gif', extension: 'gif' })
    expect(ImageFormat.detect(IMAGES.webp)).toEqual({ mime: 'image/webp', extension: 'webp' })
  })

  test('rejects SVG, HTML, empty and truncated data', () => {
    expect(ImageFormat.detect(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull()
    expect(ImageFormat.detect(new TextEncoder().encode('<html><script>alert(1)</script>'))).toBeNull()
    expect(ImageFormat.detect(new Uint8Array())).toBeNull()
    expect(ImageFormat.detect(IMAGES.png.slice(0, 4))).toBeNull()
    expect(ImageFormat.detect(new TextEncoder().encode('RIFF0000WAVE'))).toBeNull()
  })
})

describe('MediaKey', () => {
  test('creates unique keys under the right folder and round-trips through the URL', () => {
    const a = MediaKey.create('avatars', 'user-1', 'webp')
    const b = MediaKey.create('avatars', 'user-1', 'webp')
    expect(a).not.toBe(b)
    expect(a).toMatch(/^avatars\/user-1\/[0-9a-f-]+\.webp$/)
    expect(MediaKey.fromUrl(MediaKey.toUrl(a))).toBe(a)
  })

  test('sanitises owner ids so they cannot add path segments', () => {
    expect(MediaKey.create('logos', '../../etc', 'png')).toMatch(/^logos\/______etc\/[0-9a-f-]+\.png$/)
  })

  test.each([
    'avatars/u/../../secret.png',
    'avatars/u/x.svg',
    'other/u/x.png',
    'avatars/x.png',
    'avatars/u/x/y.png',
    '',
  ])('refuses key %p', (key) => {
    expect(MediaKey.parse(key)).toBeNull()
  })

  test('only our own media URLs map back to a key', () => {
    expect(MediaKey.fromUrl('https://avatars.githubusercontent.com/u/1')).toBeNull()
    expect(MediaKey.fromUrl(null)).toBeNull()
    expect(MediaKey.fromUrl('/api/media/avatars/u/../x.png')).toBeNull()
  })
})

describe('MediaStore', () => {
  const provide = (bucket: FakeBucket | undefined) =>
    Effect.provideService(Bindings, { MEDIA: bucket } as unknown as WorkerBindings)

  test('stores with the detected content type and reads it back', async () => {
    const bucket = new FakeBucket()
    await Effect.runPromise(MediaStore.put('avatars/u/a.png', IMAGES.png, 'image/png').pipe(provide(bucket)))
    expect(bucket.objects.get('avatars/u/a.png')?.contentType).toBe('image/png')
    const object = await Effect.runPromise(MediaStore.get('avatars/u/a.png').pipe(provide(bucket)))
    expect(object.httpMetadata?.contentType).toBe('image/png')
  })

  test('a missing object is MediaNotFound', async () => {
    const error = await Effect.runPromise(MediaStore.get('avatars/u/none.png').pipe(provide(new FakeBucket()), Effect.flip))
    expect(error).toBeInstanceOf(MediaNotFound)
  })

  test('quiet removal deletes, ignores nothing-to-delete, and never fails', async () => {
    const bucket = new FakeBucket()
    bucket.objects.set('logos/o/a.png', { bytes: IMAGES.png, contentType: 'image/png' })
    await Effect.runPromise(MediaStore.removeQuietly('logos/o/a.png').pipe(provide(bucket)))
    expect(bucket.objects.size).toBe(0)
    await Effect.runPromise(MediaStore.removeQuietly(null).pipe(provide(bucket)))
    bucket.failDeletes = true
    await Effect.runPromise(MediaStore.removeQuietly('logos/o/b.png').pipe(provide(bucket)))
    await Effect.runPromise(MediaStore.removeQuietly('logos/o/b.png').pipe(provide(undefined)))
  })

  test('a missing bucket binding is a typed failure for writes', async () => {
    const error = await Effect.runPromise(MediaStore.put('avatars/u/a.png', IMAGES.png, 'image/png').pipe(provide(undefined), Effect.flip))
    expect(error).toMatchObject({ _tag: 'BackendError', operation: 'media.bucket' })
  })
})
