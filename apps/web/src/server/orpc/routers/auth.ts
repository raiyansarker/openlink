import { Effect } from 'effect'

import { toUserDto } from '#/server/api/serializers'
import { signIn, signOut, signUp } from '#/server/auth/service'
import { operation } from '#/server/effect/operations'
import { readSessionEffect } from '#/server/effect/session'

import { os } from './os'
import { mergeAuthResponseCookies } from '../context'

type AuthPayload = {
  user?: { id: string; email: string; name: string; createdAt: string | Date }
}

const readAuthPayload = (response: Response) =>
  operation<AuthPayload>('auth.readResponse', () => response.json())

export const authRouter = {
  signUp: os.auth.signUp.effect(function* ({ input, context, errors }) {
    const response = yield* signUp(input.body)
    if (!response.ok) {
      return yield* Effect.fail(errors.CONFLICT({ message: 'Unable to create account for this email' }))
    }
    mergeAuthResponseCookies(context, response)
    const payload = yield* readAuthPayload(response)
    if (!payload.user) return yield* Effect.fail(errors.BAD_REQUEST({ message: 'Sign up failed' }))
    return { user: toUserDto({ ...payload.user, createdAt: new Date(payload.user.createdAt) }) }
  }),

  signIn: os.auth.signIn.effect(function* ({ input, context, errors }) {
    const response = yield* signIn(input.body)
    if (!response.ok) {
      return yield* Effect.fail(errors.UNAUTHORIZED({ message: 'Invalid email or password' }))
    }
    mergeAuthResponseCookies(context, response)
    const payload = yield* readAuthPayload(response)
    if (!payload.user) {
      return yield* Effect.fail(errors.UNAUTHORIZED({ message: 'Invalid email or password' }))
    }
    return { user: toUserDto({ ...payload.user, createdAt: new Date(payload.user.createdAt) }) }
  }),

  signOut: os.auth.signOut.effect(function* ({ context }) {
    const response = yield* signOut(context.request)
    mergeAuthResponseCookies(context, response)
    return {}
  }),

  getSession: os.auth.getSession.effect(function* () {
    const session = yield* readSessionEffect
    return session
      ? { authenticated: true as const, user: session.user }
      : { authenticated: false as const }
  }),
}
