import { ORPCError } from '@orpc/client'

import type { Organization, WorkspaceMemberRole } from '#/data/demo/types'
import { ApiClient, type OpenLinkClient } from './client'
import { ApiError } from './error'

type MembershipDto = {
  organization: { id: string; name: string; slug: string }
  role: WorkspaceMemberRole
}

/** API workspace shapes → the shapes the UI already renders. */
export class OrganizationMapper {
  static fromMembership(membership: MembershipDto): Organization {
    return OrganizationMapper.fromOrganization(membership.organization, membership.role)
  }

  static fromOrganization(
    organization: { id: string; name: string; slug: string },
    role: WorkspaceMemberRole,
  ): Organization {
    // Billing plans do not exist on the backend yet, so every workspace is "free".
    return { id: organization.id, name: organization.name, slug: organization.slug, plan: 'free', role }
  }
}

export type CreateOrganizationRequest = { name: string; slug: string; inviteToken: string }

/** Workspace (organization) calls, expressed in UI types. */
export class WorkspaceApi {
  private static sharedInstance: WorkspaceApi | undefined

  static get shared(): WorkspaceApi {
    WorkspaceApi.sharedInstance ??= new WorkspaceApi()
    return WorkspaceApi.sharedInstance
  }

  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  async listOrganizations(): Promise<Organization[]> {
    const { items } = await this.client.organizations.listOrganizations()
    return items.map(OrganizationMapper.fromMembership)
  }

  /** The creator becomes the owner. */
  async createOrganization(input: CreateOrganizationRequest): Promise<Organization> {
    try {
      const created = await this.client.organizations.createOrganization({ body: input })
      return OrganizationMapper.fromOrganization(created, 'owner')
    } catch (error) {
      if (error instanceof ORPCError && error.code === 'CONFLICT') {
        throw new ApiError({
          code: 'CONFLICT',
          status: 409,
          message: 'That workspace URL is already taken. Pick another.',
        })
      }
      throw ApiError.from(error, 'Could not create the workspace.')
    }
  }
}
