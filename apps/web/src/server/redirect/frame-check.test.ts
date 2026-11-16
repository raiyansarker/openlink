import { describe, expect, test } from 'bun:test'
import { Effect } from 'effect'

import { FrameCheck } from './frame-check'

const headers = (init: Record<string, string>) => new Headers(init)

describe('FrameCheck.allowsFraming', () => {
  test('X-Frame-Options DENY and SAMEORIGIN refuse', () => {
    expect(FrameCheck.allowsFraming(headers({ 'x-frame-options': 'DENY' }))).toBe(false)
    expect(FrameCheck.allowsFraming(headers({ 'x-frame-options': 'sameorigin' }))).toBe(false)
  })

  test('frame-ancestors refuses unless it admits any host', () => {
    expect(FrameCheck.allowsFraming(headers({ 'content-security-policy': "default-src 'self'; frame-ancestors 'self'" }))).toBe(false)
    expect(FrameCheck.allowsFraming(headers({ 'content-security-policy': 'frame-ancestors https://a.test' }))).toBe(false)
    expect(FrameCheck.allowsFraming(headers({ 'content-security-policy': 'frame-ancestors *' }))).toBe(true)
  })

  test('no framing headers allow it', () => {
    expect(FrameCheck.allowsFraming(headers({ 'content-security-policy': "img-src 'self'" }))).toBe(true)
    expect(FrameCheck.allowsFraming(headers({}))).toBe(true)
  })
})

describe('FrameCheck.frameable', () => {
  test('failures and errors count as not frameable', async () => {
    const run = (fetcher: () => Promise<Response>) => Effect.runPromise(FrameCheck.frameable('https://a.test/', fetcher))
    expect(await run(async () => new Response('ok'))).toBe(true)
    expect(await run(async () => new Response('no', { status: 500 }))).toBe(false)
    expect(await run(async () => new Response('ok', { headers: { 'x-frame-options': 'DENY' } }))).toBe(false)
    expect(await run(async () => Promise.reject(new TypeError('offline')))).toBe(false)
  })
})
