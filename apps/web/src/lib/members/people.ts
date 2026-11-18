import type { Member, PendingInvite, Role } from '#/lib/api/types'

/**
 * Members and pending invites share one list in the UI. `kind` says which
 * endpoints a row uses: members by `userId`, invites by `inviteId`.
 */
export type Person = {
  /** Unique across both kinds, for table rows. */
  key: string
  name: string
  email: string
  role: Role
  image?: string
  /** When they joined, or when the invite was sent. */
  since: string
} & ({ kind: 'member'; userId: string } | { kind: 'invite'; inviteId: string })

export function toPeople(members: readonly Member[], invites: readonly PendingInvite[]): Person[] {
  return [
    ...members.map((m): Person => ({
      kind: 'member',
      key: `member:${m.userId}`,
      userId: m.userId,
      name: m.name,
      email: m.email,
      role: m.role,
      ...(m.image ? { image: m.image } : {}),
      since: m.joinedAt,
    })),
    ...invites.map((i): Person => ({
      kind: 'invite',
      key: `invite:${i.id}`,
      inviteId: i.id,
      name: i.email,
      email: i.email,
      role: i.role,
      since: i.createdAt,
    })),
  ]
}
