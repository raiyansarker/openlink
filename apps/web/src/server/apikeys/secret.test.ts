import { describe, expect, test } from 'bun:test'
import { readBearerApiKey } from './secret'

describe('readBearerApiKey', () => {
  test('accepts only bearer tokens carrying the OpenLink prefix', () => {
    expect(readBearerApiKey('Bearer ol_live_abc')).toBe('ol_live_abc')
    expect(readBearerApiKey('bearer   ol_live_abc ')).toBe('ol_live_abc')
    expect(readBearerApiKey('Bearer sk_other')).toBeNull()
    expect(readBearerApiKey('Basic ol_live_abc')).toBeNull()
    expect(readBearerApiKey('Bearer ol_live_a b')).toBeNull()
    expect(readBearerApiKey('Bearer')).toBeNull()
    expect(readBearerApiKey(null)).toBeNull()
  })
})
