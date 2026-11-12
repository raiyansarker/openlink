import { oc } from '@orpc/contract'
import { type } from 'arktype'

import {
  AuthSessionResponse,
  EmptyResponse,
  SessionResponse,
  SignInRequest,
  SignUpRequest,
} from '../models'

export const signUp = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'signUp',
    path: '/auth/sign-up',
    successStatus: 201,
    summary: 'Register with email and password',
    tags: ['Auth'],
  })
  .input(type({ body: SignUpRequest }))
  .output(AuthSessionResponse)

export const signIn = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'signIn',
    path: '/auth/sign-in',
    summary: 'Sign in with email and password',
    tags: ['Auth'],
  })
  .input(type({ body: SignInRequest }))
  .output(AuthSessionResponse)

export const signOut = oc
  .route({
    inputStructure: 'detailed',
    method: 'POST',
    operationId: 'signOut',
    path: '/auth/sign-out',
    successStatus: 204,
    tags: ['Auth'],
  })
  .output(EmptyResponse)

export const getSession = oc
  .route({
    inputStructure: 'detailed',
    method: 'GET',
    operationId: 'getSession',
    path: '/auth/session',
    tags: ['Auth'],
  })
  .output(SessionResponse)
