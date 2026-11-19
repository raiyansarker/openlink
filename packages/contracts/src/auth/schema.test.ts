import { describe, expect, test } from 'bun:test'
import { type } from 'arktype'
import { SignUpRequest } from './schema'

const valid = { email: 'ada@example.com', password: 'password-1234', name: 'Ada' }

describe('SignUpRequest', () => {
  test('requires a name that is not only whitespace', () => {
    expect(SignUpRequest(valid) instanceof type.errors).toBe(false)
    for (const name of [undefined, '', '   ', '\t\n']) {
      expect(SignUpRequest({ ...valid, name }) instanceof type.errors).toBe(true)
    }
  })

  test('caps the name at 100 characters', () => {
    expect(SignUpRequest({ ...valid, name: 'a'.repeat(100) }) instanceof type.errors).toBe(false)
    expect(SignUpRequest({ ...valid, name: 'a'.repeat(101) }) instanceof type.errors).toBe(true)
  })
})
