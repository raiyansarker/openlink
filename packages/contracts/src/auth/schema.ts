import { type } from 'arktype'

import { Email } from '../schema-utils'

export const SignUpRequest = type({
  email: Email,
  password: 'string>=8',
  name: 'string>0',
})

export const SignInRequest = type({
  email: Email,
  password: 'string',
})

export const User = type({
  id: 'string',
  email: Email,
  name: 'string',
  createdAt: 'string',
})

export const AuthSessionResponse = type({
  user: User,
})

export const SessionResponse = type({
  authenticated: 'boolean',
  'user?': User,
})
