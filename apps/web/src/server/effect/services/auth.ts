import { Context } from 'effect'
import type { getAuth } from '#/server/auth/instance'

export class Auth extends Context.Service<Auth, ReturnType<typeof getAuth>>()('openlink/Auth') {}
