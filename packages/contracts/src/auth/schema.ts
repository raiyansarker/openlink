import { type } from 'arktype'

export const SignUpRequest = type({
  email: 'string.email',
  password: 'string>=8',
  name: 'string>0',
})

export const SignInRequest = type({
  email: 'string.email',
  password: 'string',
})

export const User = type({
  id: 'string',
  email: 'string.email',
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
