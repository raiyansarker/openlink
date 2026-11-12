import { Effect } from 'effect'

import { getMembership, isAdmin } from '#/server/org/access'
import { forbidden, notFound, unauthorized } from '#/server/orpc/errors'

import { requireAuthSession } from './session'

export const requireMembershipEffect = (organizationId: string, notFoundMessage: string) =>
  Effect.gen(function* () {
    const session = yield* requireAuthSession
    const membership = yield* Effect.promise(() =>
      getMembership(session.session.user.id, organizationId),
    )
    if (!membership) {
      return yield* Effect.fail(notFound(notFoundMessage))
    }
    return { session, membership }
  })

export const requireOrgMemberEffect = (organizationId: string) =>
  Effect.gen(function* () {
    const session = yield* requireAuthSession
    const membership = yield* Effect.promise(() =>
      getMembership(session.session.user.id, organizationId),
    )
    if (!membership) {
      return yield* Effect.fail(unauthorized())
    }
    return { session, membership }
  })

export const requireOrgAdminEffect = (organizationId: string) =>
  Effect.gen(function* () {
    const { session, membership } = yield* requireMembershipEffect(
      organizationId,
      'Organization not found',
    )
    if (!isAdmin(membership.role)) {
      return yield* Effect.fail(forbidden('Admin role required'))
    }
    return { session, membership }
  })
