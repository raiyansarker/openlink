import { getAuthenticatorName, passkey } from '@better-auth/passkey'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import * as schema from '@openlink/db/schema'
import { getBindings } from '../env'
import { getDb } from '../db'
import { API_KEY_DISABLED_PATHS, apiKeyPlugins } from './api-keys'
import { AuthEmails } from './emails'
import { AuthLog } from './auth-log'
import { AuthHooks } from './hooks'
import { AuthOrigins } from './origins'
import { EmailPasswordSignIn, SocialProviders } from './providers'

let auth: ReturnType<typeof createAuth> | undefined
let authConfigKey: string | undefined

function createAuth() {
  const bindings = getBindings()
  const hooks = new AuthHooks(getDb, getBindings)
  const emails = new AuthEmails(getBindings)

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
        passkey: schema.passkey,
        apikey: schema.apikey,
        // Read by the API key plugin to authorize workspace-owned keys (see api-keys.ts).
        member: schema.organizationMember,
      },
    }),
    socialProviders: SocialProviders.config(bindings),
    account: {
      // Link a social sign-in to an existing account only when the provider verified the email.
      accountLinking: { enabled: true },
    },
    trustedOrigins: AuthOrigins.trusted(bindings),
    disabledPaths: API_KEY_DISABLED_PATHS,
    user: {
      // Blocked while the account still owns a workspace (see AccountPolicy).
      deleteUser: {
        enabled: true,
        beforeDelete: (user) => hooks.beforeDeleteUser(user),
        afterDelete: (user) => hooks.afterDeleteUser(user),
      },
    },
    session: {
      // Written only by our session hook, never from request input.
      additionalFields: {
        city: { type: 'string', required: false, input: false },
        country: { type: 'string', required: false, input: false },
        latitude: { type: 'number', required: false, input: false },
        longitude: { type: 'number', required: false, input: false },
        signInMethod: { type: 'string', required: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: { before: (session, context) => hooks.beforeCreateSession(session, context) },
      },
      user: {
        create: {
          before: (user) => hooks.beforeCreateUser(user),
          // Email sign-ups are welcomed once they verify (below); social sign-ins arrive verified.
          after: async (user) => {
            if (user.emailVerified) await emails.welcome(user)
          },
        },
        update: { before: (update, context) => hooks.beforeUpdateUser(update, context?.path) },
      },
    },
    emailAndPassword: {
      enabled: EmailPasswordSignIn.enabled(bindings),
      minPasswordLength: 8,
      // No session until the address is confirmed; a sign-in attempt re-sends the link.
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }) => emails.resetPassword(user, url),
      onPasswordReset: ({ user }, request) => emails.passwordChanged(user, request),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => emails.verifyEmail(user, url),
      afterEmailVerification: (user) => emails.welcome(user),
    },
    plugins: [
      passkey({
        rpName: 'OpenLink',
        // The app's own host: passkeys belong to the domain people sign in on.
        rpID: new URL(bindings.BETTER_AUTH_URL).hostname,
        origin: AuthOrigins.trusted(bindings),
        registration: {
          // Unnamed passkeys get their authenticator's name (e.g. "iCloud Keychain") when it is known.
          afterVerification: async ({ verification }) => {
            const name = getAuthenticatorName(verification.registrationInfo?.aaguid)
            return name ? { name } : {}
          },
        },
      }),
      ...apiKeyPlugins(),
    ],
    advanced: {
      cookiePrefix: 'openlink',
    },
    logger: AuthLog.logger,
    onAPIError: { onError: AuthLog.onAPIError },
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
