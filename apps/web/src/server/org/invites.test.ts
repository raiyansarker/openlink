import { describe, expect, test } from 'bun:test'
import { createInviteToken, hashInviteToken, inviteEmailMatches } from './invite-tokens'

describe('organization invites', () => {
  test('hashInviteToken is deterministic', () => {
    const token = 'local-bootstrap-invite-token'
    expect(hashInviteToken(token)).toBe(
      '39dc42c71247e7fe701ae9da9fbde0820485a1e73bcc00ddccb898b07a7b2e02',
    )
  })

  test('createInviteToken returns url-safe strings', () => {
    const token = createInviteToken()
    expect(token.length).toBeGreaterThan(20)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  test('inviteEmailMatches is case-insensitive', () => {
    expect(inviteEmailMatches('User@Example.com', 'user@example.com')).toBe(true)
    expect(inviteEmailMatches('other@example.com', 'user@example.com')).toBe(false)
  })
})
