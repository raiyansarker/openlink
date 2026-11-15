import { describe, expect, test } from 'bun:test'

import { AccessRules } from './access'
import type { AuthState } from './types'

const providers = { google: true, github: true }
const signedOut: AuthState = { user: null, providers, emailPassword: false }
const person = (onboarded: boolean): AuthState => ({
  user: { id: 'u1', name: 'Ada', email: 'a@e.test', image: null, onboarded },
  providers,
  emailPassword: false,
})
const at = (pathname: string, search = '') => ({ pathname, href: `${pathname}${search}` })

describe('AccessRules.decide', () => {
  test('signed-out visitors go to login and come back where they were', () => {
    expect(AccessRules.decide(signedOut, at('/w/acme/links', '?x=1'))).toEqual({ allow: false, to: '/login', redirect: '/w/acme/links?x=1' })
    expect(AccessRules.decide(signedOut, at('/onboarding'))).toEqual({ allow: false, to: '/login', redirect: '/w' })
  })

  test('until onboarded, every page leads to onboarding', () => {
    for (const path of ['/w', '/w/acme', '/settings/profile', '/create/link', '/edit/link', '/create/organization']) {
      expect(AccessRules.decide(person(false), at(path))).toEqual({ allow: false, to: '/onboarding' })
    }
    expect(AccessRules.decide(person(false), at('/onboarding'))).toEqual({ allow: true })
  })

  test('once onboarded, the app is open and onboarding is not shown again', () => {
    expect(AccessRules.decide(person(true), at('/w/acme'))).toEqual({ allow: true })
    expect(AccessRules.decide(person(true), at('/settings/profile'))).toEqual({ allow: true })
    expect(AccessRules.decide(person(true), at('/onboarding'))).toEqual({ allow: false, to: '/w' })
  })
})
