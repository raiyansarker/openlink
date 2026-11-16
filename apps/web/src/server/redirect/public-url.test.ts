import { describe, expect, test } from 'bun:test'
import { PublicUrl } from './public-url'

const proxied = new Request('https://127.0.0.1:3000/abc?x=1', {
  headers: { host: '127.0.0.1:3000', 'x-forwarded-host': 'go.openlink.roxy', 'x-forwarded-proto': 'https' },
})

describe('PublicUrl', () => {
  test('in dev, a reverse proxy’s forwarded host and scheme win', () => {
    const url = PublicUrl.of(proxied, true)
    expect(url.href).toBe('https://go.openlink.roxy/abc?x=1')
  })

  test('in production, forwarded headers are ignored', () => {
    expect(PublicUrl.of(proxied, false).host).toBe('127.0.0.1:3000')
  })

  test('keeps an explicit forwarded port and takes the first of a chain', () => {
    const request = new Request('http://127.0.0.1:3000/', { headers: { 'x-forwarded-host': 'go.test:8443, inner.proxy' } })
    expect(PublicUrl.of(request, true).host).toBe('go.test:8443')
  })

  test('without forwarded headers the request URL is used', () => {
    expect(PublicUrl.of(new Request('http://localhost:3000/a'), true).host).toBe('localhost:3000')
  })
})
