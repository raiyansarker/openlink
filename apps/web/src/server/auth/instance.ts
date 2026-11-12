import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '@openlink/db/schema'
import { getBindings } from '../env'
import { getDb } from '../db'

let auth: ReturnType<typeof createAuth> | undefined
let authConfigKey: string | undefined

function createAuth() {
  const bindings = getBindings()

  return betterAuth({
    appName: 'OpenLink',
    baseURL: bindings.BETTER_AUTH_URL,
    secret: bindings.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    advanced: {
      cookiePrefix: 'openlink',
    },
  })
}

export function getAuth() {
  const bindings = getBindings()
  const configKey = `${bindings.BETTER_AUTH_URL}:${bindings.BETTER_AUTH_SECRET}`
  if (!auth || authConfigKey !== configKey) {
    auth = createAuth()
    authConfigKey = configKey
  }
  return auth
}
