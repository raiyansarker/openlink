import { toActivityDto } from '#/server/api/serializers'
import { requireOrgMemberEffect } from '#/server/effect/access'
import { isAdmin } from '#/server/org/permissions'
import { os } from '#/server/orpc/implement'

import { listActivity } from './service'

export const activityRouter = {
  listActivity: os.activity.listActivity.effect(function* ({ input }) {
    const { membership } = yield* requireOrgMemberEffect(input.params.organizationId)
    const { items, nextCursor } = yield* listActivity({
      organizationId: input.params.organizationId,
      ...input.query,
    })
    const includeIp = isAdmin(membership.role)
    return { items: items.map((row) => toActivityDto(row, { includeIp })), ...(nextCursor ? { nextCursor } : {}) }
  }),
}
