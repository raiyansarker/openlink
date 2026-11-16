import { ApiClient, type OpenLinkClient } from './client'
import { ApiError } from './error'

export type MyInvite = Awaited<ReturnType<OpenLinkClient['account']['listMyInvites']>>['items'][number]

/** Invites addressed to the signed-in user, answered from their inbox. Mutations throw `ApiError`. */
export class MyInvitesApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async list(): Promise<MyInvite[]> {
    const { items } = await this.client.account.listMyInvites()
    return items
  }

  /** Resolves to the joined workspace's slug. */
  async accept(inviteId: string): Promise<string> {
    try {
      const membership = await this.client.account.acceptMyInvite({ params: { inviteId } })
      return membership.organization.slug
    } catch (error) {
      throw ApiError.from(error, 'Could not join the workspace.')
    }
  }

  async decline(inviteId: string): Promise<void> {
    try {
      await this.client.account.declineMyInvite({ params: { inviteId } })
    } catch (error) {
      throw ApiError.from(error, 'Could not decline the invite.')
    }
  }
}
