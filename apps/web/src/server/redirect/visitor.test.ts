import { describe, expect, test } from 'bun:test'

import { Visitor } from './visitor'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/605.1.15 Safari/605.1.15'

describe('Visitor', () => {
  test('reads platform from the user agent', () => {
    expect(new Visitor(IPHONE, null, null).platform).toBe('ios')
    expect(new Visitor(ANDROID, null, null).platform).toBe('android')
    expect(new Visitor(MAC, null, null).platform).toBe('other')
  })

  test('takes the country from request.cf, then the cf-ipcountry header', () => {
    const viaCf = Object.assign(new Request('https://a.test/x'), { cf: { country: 'bd' } })
    expect(Visitor.fromRequest(viaCf).country).toBe('BD')
    const viaHeader = new Request('https://a.test/x', { headers: { 'cf-ipcountry': 'DE', referer: 'https://t.co/' } })
    expect(Visitor.fromRequest(viaHeader)).toMatchObject({ country: 'DE', referrer: 'https://t.co/' })
  })

  test('unknown and Tor countries read as no country', () => {
    expect(Visitor.normalizeCountry('XX')).toBeNull()
    expect(Visitor.normalizeCountry('T1')).toBeNull()
    expect(Visitor.normalizeCountry('USA')).toBeNull()
    expect(Visitor.normalizeCountry(undefined)).toBeNull()
  })

  test('spots link-preview crawlers', () => {
    expect(new Visitor('facebookexternalhit/1.1', null, null).isPreviewBot).toBe(true)
    expect(new Visitor('Slackbot-LinkExpanding 1.0', null, null).isPreviewBot).toBe(true)
    expect(new Visitor(IPHONE, null, null).isPreviewBot).toBe(false)
  })
})
