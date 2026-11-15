import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '@openlink/db/schema'
import { getBindings } from '../env'
import { getDb } from '../db'
import { AuthHooks } from './hooks'
import { AuthOrigins } from './origins'
import { SocialProviders } from './providers'

let auth: ReturnType<typeof createAuth> | undefined
let authConfigKey: string | undefined

function createAuth() {
  const bindings = getBindings()
  const hooks = new AuthHooks(getDb, getBindings)

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
    socialProviders: SocialProviders.config(bindings),
    account: {
      // Link a social sign-in to an existing account only when the provider verified the email.
      accountLinking: { enabled: true },
    },
    trustedOrigins: AuthOrigins.trusted(bindings),
    user: {
      // Blocked while the account still owns a workspace (see AccountPolicy).
      deleteUser: {
        enabled: true,
        beforeDelete: (user) => hooks.beforeDeleteUser(user),
        afterDelete: (user) => hooks.afterDeleteUser(user),
      },
    },
    databaseHooks: {
      user: {
        create: { before: (user) => hooks.beforeCreateUser(user) },
        update: { before: (update, context) => hooks.beforeUpdateUser(update, context?.path) },
      },
    },
    emailAndPassword: {
      enabled: bindings.EMAIL_PASSWORD_SIGN_IN === 'true',
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
    bindings.BETTER_AUTH_TRUSTED_ORIGINS,
    bindings.BETTER_AUTH_SECRET,
    bindings.GOOGLE_CLIENT_ID,
    bindings.GOOGLE_CLIENT_SECRET,
    bindings.GITHUB_CLIENT_ID,
    bindings.GITHUB_CLIENT_SECRET,
    bindings.EMAIL_PASSWORD_SIGN_IN,
  ].join(':')
  if (!auth || authConfigKey !== configKey) {
    auth = createAuth()
    authConfigKey = configKey
  }
  return auth
}
