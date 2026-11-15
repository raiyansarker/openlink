import { Effect } from 'effect'
import { requireOrgMembership } from '#/server/api/access'
import { canManageLinks, isAdmin } from '#/server/org/permissions'
import { forbidden, notFound } from '#/server/orpc/errors'
import { requirePrincipal, type Principal } from './principal'

/** An API key belongs to exactly one workspace and acts with the role it was issued. */
const membershipFor = (principal: Principal, organizationId: string) =>
  principal.apiKey
    ? Effect.succeed(
        principal.apiKey.organizationId === organizationId ? { role: principal.apiKey.role } : null,
      )
    : requireOrgMembership(principal.session.user.id, organizationId)

export const requireMembershipEffect = (organizationId: string, notFoundMessage: string) =>
  Effect.gen(function* () {
    const session = yield* requirePrincipal
    const membership = yield* membershipFor(session, organizationId)
    if (!membership) return yield* Effect.fail(notFound(notFoundMessage))
    return { session, membership }
  })

export const requireOrgMemberEffect = (organizationId: string) =>
  Effect.gen(function* () {
    const session = yield* requirePrincipal
    const membership = yield* membershipFor(session, organizationId)
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

export const requireOrgOwnerEffect = (organizationId: string) =>
  Effect.gen(function* () {
    const result = yield* requireOrgMemberEffect(organizationId)
    if (result.membership.role !== 'owner') {
      return yield* Effect.fail(forbidden('Owner role required'))
    }
    return result
  })

/** Administrator who is a signed-in member. API keys may never manage credentials. */
export const requireOrgAdminUserEffect = (organizationId: string) =>
  Effect.gen(function* () {
    const result = yield* requireOrgAdminEffect(organizationId)
    if (result.session.apiKey) {
      return yield* Effect.fail(forbidden('API keys cannot manage API keys'))
    }
    return result
  })
