import { Context, Layer } from 'effect'
import { getAuth } from '#/server/auth/instance'

export class Auth extends Context.Service<Auth, ReturnType<typeof getAuth>>()('openlink/Auth') {}

export const AuthLive = Layer.sync(Auth, getAuth)
