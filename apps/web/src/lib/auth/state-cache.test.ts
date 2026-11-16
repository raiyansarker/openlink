import { describe, expect, test } from 'bun:test'
import { AuthStateCache } from './state-cache'
import type { AuthState } from './types'

const signedOut: AuthState = { user: null, providers: { google: false, github: false } }

describe('AuthStateCache', () => {
  test('shares one lookup within the ttl and refreshes after it', async () => {
    let calls = 0
    let time = 0
    const cache = new AuthStateCache(async () => (calls += 1, signedOut), { ttlMs: 1000, now: () => time })
    await Promise.all([cache.get(), cache.get()])
    time = 999
    await cache.get()
    expect(calls).toBe(1)
    time = 1000
    await cache.get()
    expect(calls).toBe(2)
  })

  test('clear forces a fresh lookup', async () => {
    let calls = 0
    const cache = new AuthStateCache(async () => (calls += 1, signedOut))
    await cache.get()
    cache.clear()
    await cache.get()
    expect(calls).toBe(2)
  })

  test('failures are not cached', async () => {
    let calls = 0
    const cache = new AuthStateCache(async () => {
      calls += 1
      if (calls === 1) throw new Error('network')
      return signedOut
    })
    await expect(cache.get()).rejects.toThrow('network')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(await cache.get()).toEqual(signedOut)
    expect(calls).toBe(2)
  })

  test('a disabled cache never shares results between callers', async () => {
    const users = ['alice', 'bob']
    let calls = 0
    const cache = new AuthStateCache(
      async () => ({ ...signedOut, user: { id: users[calls++]!, name: '', email: '', image: null } }),
      { enabled: false },
    )
    const first = await cache.get()
    const second = await cache.get()
    expect(first.user?.id).toBe('alice')
    expect(second.user?.id).toBe('bob')
    expect(calls).toBe(2)
  })
})
