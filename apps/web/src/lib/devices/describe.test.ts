import { describe, expect, test } from 'bun:test'

import { countryName, describeDeviceSession } from './describe'

const base = {
  id: 's1', current: true, signedInAt: '2026-01-01T00:00:00.000Z', lastActiveAt: '2026-01-02T00:00:00.000Z',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
}

describe('describeDeviceSession', () => {
  test('describes the device, place, and sign-in method', () => {
    expect(
      describeDeviceSession({ ...base, ipAddress: '203.0.113.7', city: 'Dhaka', country: 'BD', latitude: 23.8, longitude: 90.4, signInMethod: 'github' }),
    ).toEqual({
      id: 's1', kind: 'laptop', name: 'Chrome on macOS', client: 'Chrome 141', os: 'macOS', city: 'Dhaka', country: 'Bangladesh',
      coordinates: { lat: 23.8, lng: 90.4 }, ipAddress: '203.0.113.7', signInMethod: 'GitHub',
      signedInAt: base.signedInAt, lastActiveAt: base.lastActiveAt, isCurrent: true,
    })
  })

  test('leaves unknown location out instead of inventing one', () => {
    const session = describeDeviceSession({ ...base, current: false })
    expect(session).not.toHaveProperty('city')
    expect(session).not.toHaveProperty('coordinates')
    expect(session).toMatchObject({ ipAddress: 'Unknown', signInMethod: 'Unknown', isCurrent: false })
  })

  test('country codes become names; odd values pass through', () => {
    expect(countryName('PT')).toBe('Portugal')
    expect(countryName('T1')).toBe('T1')
    expect(countryName('Somewhere')).toBe('Somewhere')
  })
})
