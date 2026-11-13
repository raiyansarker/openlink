import { Effect } from 'effect'
import { requireOrgMembership } from '#/server/api/access'
import { canManageLinks, isAdmin } from '#/server/org/permissions'
import { forbidden, notFound } from '#/server/orpc/errors'
import { requireAuthSession } from './session'

export const requireMembershipEffect = (organizationId: string, notFoundMessage: string) =>
  Effect.gen(function* () {
    const session = yield* requireAuthSession
    const membership = yield* requireOrgMembership(session.session.user.id, organizationId)
    if (!membership) return yield* Effect.fail(notFound(notFoundMessage))
    return { session, membership }
  })

export const requireOrgMemberEffect = (organizationId: string) =>
  Effect.gen(function* () {
    const session = yield* requireAuthSession
    const membership = yield* requireOrgMembership(session.session.user.id, organizationId)
    if (!membership) {
      return yield* Effect.fail(forbidden('Not a member of this organization'))
    }
    return { session, membership }
  })

export const requireOrgAdminEffect = (organizationId: string) =>
  Effect.gen(function* () {
    const result = yield* requireOrgMemberEffect(organizationId)
    if (!isAdmin(result.membership.role)) {
      return yield* Effect.fail(forbidden('Admin role required'))
    }
    return result
  })

export const requireLinkWriterEffect = (organizationId: string) =>
  Effect.gen(function* () {
    const result = yield* requireOrgMemberEffect(organizationId)
    if (!canManageLinks(result.membership.role)) {
      return yield* Effect.fail(forbidden('Member role required to manage links'))
    }
    return result
  })
