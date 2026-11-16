import type { WorkspaceApiKey } from '#/data/demo/api-keys'
import { ApiClient, type OpenLinkClient } from './client'
import { ApiError } from './error'
import type { AssignableRole } from './members'

type ApiKeyDto = Awaited<ReturnType<OpenLinkClient['apiKeys']['listApiKeys']>>['items'][number]

/** A workspace's API keys. Secrets are made by the server and shown once. */
export class ApiKeysApi {
  constructor(private readonly client: OpenLinkClient = ApiClient.instance) {}

  static toUi(row: ApiKeyDto): WorkspaceApiKey {
    return { id: row.id, name: row.name, prefix: row.prefix, role: row.role, createdAt: row.createdAt, lastUsedAt: row.lastUsedAt }
  }

  async list(organizationId: string): Promise<WorkspaceApiKey[]> {
    const { items } = await this.client.apiKeys.listApiKeys({ params: { organizationId } })
    return items.map(ApiKeysApi.toUi)
  }

  /** Returns the full secret, which the server never shows again. */
  async create(organizationId: string, input: { name: string; role: AssignableRole }): Promise<string> {
    try {
      const created = await this.client.apiKeys.createApiKey({ params: { organizationId }, body: input })
      return created.secret
    } catch (error) {
      throw ApiError.from(error, 'Could not create the key.')
    }
  }

  async changeRole(organizationId: string, keyId: string, role: AssignableRole): Promise<void> {
    try {
      await this.client.apiKeys.updateApiKey({ params: { organizationId, keyId }, body: { role } })
    } catch (error) {
      throw ApiError.from(error, 'Could not change the key role.')
    }
  }

  async revoke(organizationId: string, keyId: string): Promise<void> {
    try {
      await this.client.apiKeys.revokeApiKey({ params: { organizationId, keyId } })
    } catch (error) {
      throw ApiError.from(error, 'Could not revoke the key.')
    }
  }

  /**
   * Replace a key with a new secret: a new key with the same name and role is
   * created first, then the old one is revoked, so there is never a moment with
   * no working key.
   */
  async rotate(organizationId: string, key: { id: string; name: string; role: AssignableRole }): Promise<string> {
    const secret = await this.create(organizationId, { name: key.name, role: key.role })
    await this.revoke(organizationId, key.id)
    return secret
  }
}
