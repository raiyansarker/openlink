import { afterEach, describe, expect, test } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { organization, organizationMember, user } from '@openlink/db/schema'
import { eq } from 'drizzle-orm'
import { Effect } from 'effect'

import type { WorkerBindings } from '#/server/env'
import { Auth } from '#/server/effect/services/auth'
import { Bindings } from '#/server/effect/services/bindings'
import { Db } from '#/server/effect/services/db'
import { WorkerRequest } from '#/server/effect/services/request'
import { createTestDatabase } from '#/server/testing/sqlite'
import { MediaKey } from './media-key'
import { FakeBucket, IMAGES } from './test-support'
import { MediaUploads } from './uploads'

const APP = 'http://localhost:3000'
const databases: Database[] = []
afterEach(() => {
  for (const database of databases.splice(0)) database.close()
})

function setup(options: { signedIn?: string | null; role?: 'owner' | 'admin' | 'member' | 'viewer' } = {}) {
  const { sqlite, adapter, db } = createTestDatabase()
  databases.push(sqlite)
  const now = new Date()
  adapter.insert(user).values([
    { id: 'u1', name: 'Ada', email: 'ada@e.test', image: 'https://avatars.githubusercontent.com/u/1', createdAt: now, updatedAt: now },
  ]).run()
  adapter.insert(organization).values({ id: 'o1', name: 'Acme', slug: 'acme', createdAt: now, updatedAt: now }).run()
  if (options.role) {
    adapter.insert(organizationMember).values({ id: 'm1', organizationId: 'o1', userId: 'u1', role: options.role, joinedAt: now }).run()
  }
  const bucket = new FakeBucket()
  const signedIn = options.signedIn === undefined ? 'u1' : options.signedIn
  const getSession = async () =>
    signedIn ? { session: { id: 's' }, user: { id: signedIn, name: 'Ada', email: 'ada@e.test', createdAt: now } } : null

  const run = <A>(effect: Effect.Effect<A, unknown, never>, init: { body?: Uint8Array; origin?: string | null; method?: string } = {}) => {
    const headers: Record<string, string> = {}
    if (init.origin !== null) headers.origin = init.origin ?? APP
    if (init.body) headers['content-type'] = 'image/webp'
    const request = new Request('http://localhost:3000/api/uploads/x', { method: init.method ?? 'PUT', headers, body: init.body })
    return Effect.runPromise(
      MediaUploads.respond(effect, (value) => value).pipe(
        Effect.provideService(WorkerRequest, request),
        Effect.provideService(Db, db),
        Effect.provideService(Bindings, { MEDIA: bucket, BETTER_AUTH_URL: APP } as unknown as WorkerBindings),
        Effect.provideService(Auth, Effect.succeed({ api: { getSession } }) as never),
      ) as Effect.Effect<Response, never, never>,
    )
  }
  const serve = (key: string) =>
    Effect.runPromise(
      MediaUploads.serve(key).pipe(
        Effect.provideService(Bindings, { MEDIA: bucket, BETTER_AUTH_URL: APP } as unknown as WorkerBindings),
      ),
    )
  const imageOf = () => adapter.select().from(user).where(eq(user.id, 'u1')).get()?.image
  return { run, serve, bucket, imageOf, adapter }
}

const json = async (response: Response) => ({ status: response.status, body: response.status === 204 ? null : await response.json() })

describe('avatar uploads', () => {
  test('stores the image in R2 and points the profile at it', async () => {
    const t = setup()
    const { status, body } = await json(await t.run(MediaUploads.setAvatar as never, { body: IMAGES.webp }))
    expect(status).toBe(200)
    const key = MediaKey.fromUrl(body.url)!
    expect(key).toMatch(/^avatars\/u1\//)
    expect(t.bucket.objects.get(key)?.contentType).toBe('image/webp')
    expect(t.imageOf()).toBe(body.url)
  })

  test('replacing a picture deletes the previous upload; a provider picture is left alone', async () => {
    const t = setup()
    const first = (await json(await t.run(MediaUploads.setAvatar as never, { body: IMAGES.png }))).body.url
    expect(t.bucket.objects.size).toBe(1)
    const second = (await json(await t.run(MediaUploads.setAvatar as never, { body: IMAGES.webp }))).body.url
    expect(second).not.toBe(first)
    expect([...t.bucket.objects.keys()]).toEqual([MediaKey.fromUrl(second)])
  })

  test('removing clears the profile and deletes the object', async () => {
    const t = setup()
    await t.run(MediaUploads.setAvatar as never, { body: IMAGES.webp })
    expect((await t.run(MediaUploads.clearAvatar as never, { method: 'DELETE' })).status).toBe(204)
    expect(t.imageOf()).toBeNull()
    expect(t.bucket.objects.size).toBe(0)
  })

  test('the file must really be an image, whatever its declared type', async () => {
    const t = setup()
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
    const { status, body } = await json(await t.run(MediaUploads.setAvatar as never, { body: svg }))
    expect(status).toBe(415)
    expect(body.message).toContain('PNG, JPG, WebP, or GIF')
    expect(t.bucket.objects.size).toBe(0)
  })

  test('oversized uploads are refused', async () => {
    const t = setup()
    const big = new Uint8Array(MediaUploads.MAX_BYTES + 1)
    big.set(IMAGES.png)
    expect((await t.run(MediaUploads.setAvatar as never, { body: big })).status).toBe(413)
  })

  test('signed-out callers are refused before anything is stored', async () => {
    const t = setup({ signedIn: null })
    expect((await t.run(MediaUploads.setAvatar as never, { body: IMAGES.png })).status).toBe(401)
    expect(t.bucket.objects.size).toBe(0)
  })

  test('requests from another site, or with no Origin, are refused', async () => {
    const t = setup()
    expect((await t.run(MediaUploads.setAvatar as never, { body: IMAGES.png, origin: 'https://evil.example' })).status).toBe(403)
    expect((await t.run(MediaUploads.setAvatar as never, { body: IMAGES.png, origin: null })).status).toBe(403)
    expect((await t.run(MediaUploads.clearAvatar as never, { method: 'DELETE', origin: 'https://evil.example' })).status).toBe(403)
    expect(t.imageOf()).toBe('https://avatars.githubusercontent.com/u/1')
  })
})

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
