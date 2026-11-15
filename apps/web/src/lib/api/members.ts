import type { WorkspaceMember, WorkspaceMemberRole } from '#/data/demo/types'
import { ApiClient, type OpenLinkClient } from './client'
import { ApiError } from './error'

type MemberDto = Awaited<ReturnType<OpenLinkClient['organizations']['listMembers']>>['items'][number]
type InviteDto = Awaited<ReturnType<OpenLinkClient['organizations']['listOrganizationInvites']>>['items'][number]
export type AssignableRole = Exclude<WorkspaceMemberRole, 'owner'>

/**
 * People and pending invites share one list in the UI. Ids carry their kind
 * (`user:…` or `invite:…`) so every action knows which endpoint to call.
 */
export class MemberId {
  static ofUser(userId: string) {
    return `user:${userId}`
  }
  static ofInvite(inviteId: string) {
    return `invite:${inviteId}`
  }
  static parse(id: string): { kind: 'user' | 'invite'; id: string } | null {
    const [kind, ...rest] = id.split(':')
    const value = rest.join(':')
    return (kind === 'user' || kind === 'invite') && value ? { kind, id: value } : null
  }
}

export class MemberMapper {
  static fromMember(row: MemberDto, organizationId: string): WorkspaceMember {
    return {
      id: MemberId.ofUser(row.userId),
      orgId: organizationId,
      name: row.name,
      email: row.email,
      role: row.role,
      status: 'active',
      joinedAt: row.joinedAt,
      ...(row.image ? { avatarUrl: row.image } : {}),
    }
  }

  static fromInvite(row: InviteDto): WorkspaceMember {
    return {
      id: MemberId.ofInvite(row.id),
      orgId: row.organizationId,
      name: row.email,
      email: row.email,
      role: row.role,
      status: 'pending',
      joinedAt: row.createdAt,
    }
  }
}

/** Members and invites of one workspace. Mutations throw `ApiError` with a message to show. */
export class WorkspaceMembersApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  /** Pending invites are only visible to owners and admins; others get people only. */
  async list(organizationId: string, options: { includeInvites: boolean }): Promise<WorkspaceMember[]> {
    const params = { organizationId }
    const [members, invites] = await Promise.all([
      this.client.organizations.listMembers({ params }),
      options.includeInvites ? this.client.organizations.listOrganizationInvites({ params }) : Promise.resolve({ items: [] }),
    ])
    return [
      ...members.items.map((row) => MemberMapper.fromMember(row, organizationId)),
      ...invites.items.map(MemberMapper.fromInvite),
    ]
  }

  async invite(organizationId: string, email: string, role: AssignableRole): Promise<void> {
    await this.call(() => this.client.organizations.createOrganizationInvite({ params: { organizationId }, body: { email, role } }), 'Could not send the invite.')
  }

  async changeRole(organizationId: string, memberId: string, role: AssignableRole): Promise<void> {
    const target = this.userTarget(memberId)
    await this.call(() => this.client.organizations.updateMemberRole({ params: { organizationId, userId: target }, body: { role } }), 'Could not change the role.')
  }

  /** Removes a person, or cancels a pending invite. */
  async remove(organizationId: string, memberId: string): Promise<void> {
    const parsed = MemberId.parse(memberId)
    if (!parsed) throw new ApiError({ code: 'BAD_REQUEST', status: 400, message: 'Unknown member.' })
    if (parsed.kind === 'invite') {
      await this.call(() => this.client.organizations.revokeOrganizationInvite({ params: { organizationId, inviteId: parsed.id } }), 'Could not cancel the invite.')
    } else {
      await this.call(() => this.client.organizations.removeMember({ params: { organizationId, userId: parsed.id } }), 'Could not remove the member.')
    }
  }

  async resendInvite(organizationId: string, memberId: string): Promise<void> {
    const parsed = MemberId.parse(memberId)
    if (parsed?.kind !== 'invite') throw new ApiError({ code: 'BAD_REQUEST', status: 400, message: 'Only pending invites can be resent.' })
    await this.call(() => this.client.organizations.resendOrganizationInvite({ params: { organizationId, inviteId: parsed.id } }), 'Could not resend the invite.')
  }

  async transferOwnership(organizationId: string, memberId: string): Promise<void> {
    const userId = this.userTarget(memberId)
    await this.call(() => this.client.organizations.transferOwnership({ params: { organizationId }, body: { userId } }), 'Could not transfer ownership.')
  }

  private userTarget(memberId: string) {
    const parsed = MemberId.parse(memberId)
    if (parsed?.kind !== 'user') throw new ApiError({ code: 'BAD_REQUEST', status: 400, message: 'That person has not joined yet.' })
    return parsed.id
  }

  private async call(run: () => Promise<unknown>, fallback: string) {
    try {
      await run()
    } catch (error) {
      throw ApiError.from(error, fallback)
    }
  }
}
