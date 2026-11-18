import { describe, expect, test } from 'bun:test'

import { FormOrigin } from './form-origin'

const APP = 'https://app.example.com'
const bindings = { BETTER_AUTH_URL: APP }
const request = (init: { method?: string; type?: string; origin?: string; authorization?: string }) =>
  new Request(`${APP}/api/v1/organizations`, {
    method: init.method ?? 'POST',
    headers: {
      ...(init.type ? { 'content-type': init.type } : {}),
      ...(init.origin ? { origin: init.origin } : {}),
      ...(init.authorization ? { authorization: init.authorization } : {}),
    },
  })

describe('FormOrigin', () => {
  test('form bodies sent with cookies must come from the app', () => {
    for (const type of ['multipart/form-data; boundary=x', 'application/x-www-form-urlencoded', 'text/plain']) {
      expect(FormOrigin.needsCheck(request({ type }))).toBe(true)
    }
    expect(FormOrigin.isTrusted(request({ type: 'multipart/form-data', origin: APP }), bindings)).toBe(true)
    expect(FormOrigin.isTrusted(request({ type: 'multipart/form-data', origin: 'https://evil.example' }), bindings)).toBe(false)
    expect(FormOrigin.isTrusted(request({ type: 'multipart/form-data' }), bindings)).toBe(false)
  })

  test('JSON, reads and API-key requests are not checked', () => {
    expect(FormOrigin.needsCheck(request({ type: 'application/json' }))).toBe(false)
    expect(FormOrigin.needsCheck(request({ method: 'GET' }))).toBe(false)
    expect(FormOrigin.needsCheck(request({ type: 'multipart/form-data', authorization: 'Bearer sk_abc' }))).toBe(false)
  })
})
