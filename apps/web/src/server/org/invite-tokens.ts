import { createHash, randomBytes } from 'node:crypto'

export function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createInviteToken() {
  return randomBytes(24).toString('base64url')
}

export function inviteEmailMatches(inviteEmail: string, userEmail: string) {
  return inviteEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()
}
