import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '@openlink/db/schema'
import { getBindings } from '../env'
import { getDb } from '../db'
import { socialProviderConfig } from './providers'

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
    socialProviders: socialProviderConfig(bindings),
    account: {
      // Link a social sign-in to an existing account only when the provider verified the email.
      accountLinking: { enabled: true },
    },
    trustedOrigins: [bindings.BETTER_AUTH_URL],
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
  const configKey = [
    bindings.BETTER_AUTH_URL,
    bindings.BETTER_AUTH_SECRET,
    bindings.GOOGLE_CLIENT_ID,
    bindings.GOOGLE_CLIENT_SECRET,
    bindings.GITHUB_CLIENT_ID,
    bindings.GITHUB_CLIENT_SECRET,
  ].join(':')
  if (!auth || authConfigKey !== configKey) {
    auth = createAuth()
    authConfigKey = configKey
  }
  return auth
}
