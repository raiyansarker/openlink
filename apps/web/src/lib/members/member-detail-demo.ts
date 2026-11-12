import type { WorkspaceMember } from '#/data/demo/types'

export function demoLinksCreatedCount(memberId: string): number {
  let hash = 0
  for (let i = 0; i < memberId.length; i += 1) {
    hash = (hash * 17 + memberId.charCodeAt(i)) % 97
  }
  return hash + 3
}

export function demoSignInMethod(member: WorkspaceMember): string {
  if (member.status === 'pending') return 'Invite not accepted'
  return member.email.endsWith('@contract.dev') ? 'SSO (Google)' : 'Email & password'
}
