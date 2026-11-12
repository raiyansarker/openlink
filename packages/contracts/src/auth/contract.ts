import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import {
  AuthSessionResponse,
  SessionResponse,
  SignInRequest,
  SignUpRequest,
} from './schema'

export const signUp = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'signUp',
      path: '/auth/sign-up',
      successStatus: 201,
      summary: 'Register with email and password',
      inputStructure: 'detailed',
      tags: ['Auth'],
    }),
  )
  .input(type({ body: SignUpRequest }))
  .output(AuthSessionResponse)

export const signIn = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'signIn',
      path: '/auth/sign-in',
      summary: 'Sign in with email and password',
      inputStructure: 'detailed',
      tags: ['Auth'],
    }),
  )
  .input(type({ body: SignInRequest }))
  .output(AuthSessionResponse)

export const signOut = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'signOut',
      path: '/auth/sign-out',
      successStatus: 204,
      inputStructure: 'detailed',
      tags: ['Auth'],
    }),
  )
  .output(EmptyResponse)

export const getSession = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'getSession',
      path: '/auth/session',
      inputStructure: 'detailed',
      tags: ['Auth'],
    }),
  )
  .output(SessionResponse)

export const contract = {
  signUp,
  signIn,
  signOut,
  getSession,
} as const
