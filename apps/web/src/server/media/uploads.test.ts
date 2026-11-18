import { describe, expect, test } from 'bun:test'
import { Effect } from 'effect'

import type { WorkerBindings } from '#/server/env'
import { Bindings } from '#/server/effect/services/bindings'
import { FakeBucket, IMAGES } from './test-support'
import { MediaUploads } from './uploads'

// Storing images is tested where they are used: account/picture.test.ts and org/workspace.test.ts.
function setup() {
  const bucket = new FakeBucket()
  const serve = (key: string) =>
    Effect.runPromise(
      MediaUploads.serve(key).pipe(Effect.provideService(Bindings, { MEDIA: bucket } as unknown as WorkerBindings)),
    )
  return { serve, bucket }
}

describe('serving media', () => {
  test('serves stored images with safe, permanent caching headers', async () => {
    const t = setup()
    t.bucket.objects.set('logos/o1/abc.png', { bytes: IMAGES.png, contentType: 'image/png' })
    const response = await t.serve('logos/o1/abc.png')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toContain('immutable')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-security-policy')).toContain('sandbox')
  })

  test('unknown objects and keys outside our folders are 404', async () => {
    const t = setup()
    for (const key of ['logos/o1/missing.png', '../secret', 'other/x/y.png', 'logos/o1/../../a.png']) {
      expect((await t.serve(key)).status).toBe(404)
    }
  })
})
