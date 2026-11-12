import { DEMO_USER_AVATAR_URL } from '#/components/dashboard/layout/dashboard-shell-colors'
import type { WorkspaceMember } from '#/data/demo/types'

/**
 * Unsplash portrait ids verified with HTTP 200 (images.unsplash.com, w=128 crop).
 * @see https://unsplash.com/license
 */
const VERIFIED_UNSPLASH_PORTRAIT_IDS = [
  '1494790108377-be9c29b29330',
  '1507003211169-0a1dd7228f2d',
  '1472099645785-5658abf4ff4e',
  '1438761681033-6461ffad8d80',
  '1534528741775-53994a69daeb',
  '1517841905240-472988babdf9',
  '1506794778202-cad84cf45f1d',
  '1500648767791-00dcc994a43e',
  '1544005313-94ddf0286df2',
  '1560250097-0b93528c311a',
  '1573496359142-b8d87734a5a2',
  '1580489944761-15a19d654956',
  '1508214751196-bcfd4ca60f91',
  '1552058544-f2b08422138a',
  '1531746020798-e6953c6e8e04',
  '1502823403499-6ccfcf4fb453',
  '1511367461989-f85a21fda167',
  '1529626455594-4ff0802cfb7e',
] as const

function portraitIndex(seed: string, modulo: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % modulo
  }
  return hash
}

export function unsplashPortraitUrl(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?w=128&h=128&fit=crop&crop=faces&auto=format&fm=jpg&q=80`
}

export function demoMemberAvatarUrl(
  member: Pick<WorkspaceMember, 'id' | 'email'>,
): string {
  if (member.email === 'developerraiyan@gmail.com') {
    return DEMO_USER_AVATAR_URL
  }
  const index = portraitIndex(
    member.id,
    VERIFIED_UNSPLASH_PORTRAIT_IDS.length,
  )
  return unsplashPortraitUrl(VERIFIED_UNSPLASH_PORTRAIT_IDS[index])
}

export function withDemoMemberAvatar(member: WorkspaceMember): WorkspaceMember {
  return {
    ...member,
    avatarUrl: member.avatarUrl ?? demoMemberAvatarUrl(member),
  }
}
