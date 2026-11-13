import type { SignInRequest, SignUpRequest } from '@openlink/contracts'
import { Effect } from 'effect'
import { operation } from '../effect/operations'
import { Auth } from '../effect/services/auth'

export function signUp(input: typeof SignUpRequest.infer) {
  return Effect.gen(function* () {
    const auth = yield* Auth
    return yield* operation('auth.signUp', () => auth.api.signUpEmail({
      body: input,
      asResponse: true,
    }))
  })
}

export function signIn(input: typeof SignInRequest.infer) {
  return Effect.gen(function* () {
    const auth = yield* Auth
    return yield* operation('auth.signIn', () => auth.api.signInEmail({
      body: input,
      asResponse: true,
    }))
  })
}

export function signOut(request: Request) {
  return Effect.gen(function* () {
    const auth = yield* Auth
    return yield* operation('auth.signOut', () => auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    }))
  })
}
