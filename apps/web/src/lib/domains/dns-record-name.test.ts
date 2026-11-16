import { describe, expect, test } from 'bun:test'

import { DnsRecordName } from './dns-record-name'

const name = (record: string, domain = 'go.company.com') => {
  const n = DnsRecordName.of(record, domain)
  return { fqdn: n.fqdn, host: n.host, zone: n.zone }
}

describe('DnsRecordName', () => {
  test('full names from the SDK are never doubled', () => {
    // The bug: the old display turned these into "go.company.com.go.company.com".
    expect(name('go.company.com')).toEqual({ fqdn: 'go.company.com', host: 'go', zone: 'company.com' })
    expect(name('_cf-custom-hostname.go.company.com')).toEqual({
      fqdn: '_cf-custom-hostname.go.company.com',
      host: '_cf-custom-hostname.go',
      zone: 'company.com',
    })
  })

  test('relative labels and @ still work', () => {
    expect(name('_verify')).toMatchObject({ fqdn: '_verify.go.company.com', host: '_verify.go' })
    expect(name('@')).toMatchObject({ fqdn: 'go.company.com', host: 'go' })
  })

  test('the zone honors multi-part and shared suffixes', () => {
    expect(name('go.company.co.uk', 'go.company.co.uk')).toEqual({ fqdn: 'go.company.co.uk', host: 'go', zone: 'company.co.uk' })
    expect(name('links.me.github.io', 'links.me.github.io')).toMatchObject({ host: 'links', zone: 'me.github.io' })
  })

  test('a domain at the zone apex uses @', () => {
    expect(name('company.com', 'company.com')).toEqual({ fqdn: 'company.com', host: '@', zone: 'company.com' })
  })

  test('case and a trailing dot are ignored', () => {
    expect(name('Go.Company.com.', 'GO.company.COM')).toMatchObject({ fqdn: 'go.company.com', host: 'go' })
  })
})
