import { Effect } from 'effect'

import { toApiKeyDto } from '#/server/api/serializers'
import { requireOrgAdminUserEffect } from '#/server/effect/access'
import { createApiKey, listApiKeys, revokeApiKey, updateApiKeyRole } from '#/server/apikeys/service'
import { audit } from '#/server/activity/audit'

import { os } from './os'

export const apiKeysRouter = {
  listApiKeys: os.apiKeys.listApiKeys.effect(function* ({ input }) {
    yield* requireOrgAdminUserEffect(input.params.organizationId)
    const rows = yield* listApiKeys(input.params.organizationId)
    return { items: rows.map(toApiKeyDto) }
  }),

  createApiKey: os.apiKeys.createApiKey.effect(function* ({ input, errors }) {
    const { session } = yield* requireOrgAdminUserEffect(input.params.organizationId)
    const name = input.body.name.trim()
    if (!name) return yield* Effect.fail(errors.BAD_REQUEST({ message: 'Enter a name for the key' }))
    const { row, secret } = yield* createApiKey({
      organizationId: input.params.organizationId,
      name,
      role: input.body.role,
      createdByUserId: session.session.user.id,
    })
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'apikey.created',
      target: { type: 'api_key', id: row.id, label: row.name },
      changes: [{ label: 'Role', from: '—', to: row.role }],
    })
    return { ...toApiKeyDto(row), secret }
  }),

  updateApiKey: os.apiKeys.updateApiKey.effect(function* ({ input, errors }) {
    const { session } = yield* requireOrgAdminUserEffect(input.params.organizationId)
    const { row, previousRole } = yield* updateApiKeyRole({
      organizationId: input.params.organizationId,
      keyId: input.params.keyId,
      role: input.body.role,
    }).pipe(Effect.catchTags({ ApiKeyNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'API key not found' })) }))
    if (previousRole !== row.role) {
      yield* audit(session, {
        organizationId: input.params.organizationId,
        action: 'apikey.role_changed',
        target: { type: 'api_key', id: row.id, label: row.name },
        changes: [{ label: 'Role', from: previousRole, to: row.role }],
      })
    }
    return toApiKeyDto(row)
  }),

  revokeApiKey: os.apiKeys.revokeApiKey.effect(function* ({ input, errors }) {
    const { session } = yield* requireOrgAdminUserEffect(input.params.organizationId)
    const revoked = yield* revokeApiKey(input.params.organizationId, input.params.keyId).pipe(
      Effect.catchTags({ ApiKeyNotFound: () => Effect.fail(errors.NOT_FOUND({ message: 'API key not found' })) }),
    )
    yield* audit(session, {
      organizationId: input.params.organizationId,
      action: 'apikey.revoked',
      target: { type: 'api_key', id: revoked.id, label: revoked.name },
    })
    return {}
  }),
}
