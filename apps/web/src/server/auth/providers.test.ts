import { describe, expect, test } from 'bun:test'
import { SocialProviders } from './providers'

const enabledSocialProviders = SocialProviders.enabled
const socialProviderConfig = SocialProviders.config

describe('SocialProviders', () => {
  test('enables only providers with both id and secret', () => {
    const env = { GOOGLE_CLIENT_ID: 'g', GOOGLE_CLIENT_SECRET: 's', GITHUB_CLIENT_ID: 'h' }
    expect(socialProviderConfig(env)).toEqual({ google: { clientId: 'g', clientSecret: 's' } })
    expect(enabledSocialProviders(env)).toEqual({ google: true, github: false })
  })

  test('treats blank values as missing and trims the rest', () => {
    const env = { GOOGLE_CLIENT_ID: '  ', GOOGLE_CLIENT_SECRET: 's', GITHUB_CLIENT_ID: ' h ', GITHUB_CLIENT_SECRET: ' x ' }
    expect(enabledSocialProviders(env)).toEqual({ google: false, github: true })
    expect(socialProviderConfig(env)).toEqual({ github: { clientId: 'h', clientSecret: 'x' } })
  })

  test('no configuration means email and password only', () => {
    expect(socialProviderConfig({})).toEqual({})
    expect(enabledSocialProviders({})).toEqual({ google: false, github: false })
  })
})
