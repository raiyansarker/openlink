import { type } from 'arktype'

import { Email } from '../schema-utils'

/** A display name: up to 100 characters, not only whitespace. The server trims it. */
export const PersonName = type('string <= 100').and(/\S/)

export const SignUpRequest = type({
  email: Email,
  password: 'string>=8',
  name: PersonName,
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
