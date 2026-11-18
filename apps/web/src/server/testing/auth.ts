import * as schema from '@openlink/db/schema'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

import { apiKeyPlugins } from '#/server/auth/api-keys'

/**
 * A real Better Auth instance with the production API key setup, backed by a test
 * database from `createTestDatabase`.
 */
export function createTestAuth(db: unknown) {
  return betterAuth({
    baseURL: 'http://localhost',
    secret: 'test-secret-that-is-at-least-32-characters-long',
    database: drizzleAdapter(db as Parameters<typeof drizzleAdapter>[0], {
      provider: 'sqlite',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        apikey: schema.apikey,
        member: schema.organizationMember,
      },
    }),
    emailAndPassword: { enabled: true },
    plugins: [...apiKeyPlugins()],
    logger: { disabled: true },
  })
}

/** Sign up a user and return their id and the cookie headers of their session. */
export async function signUpTestUser(auth: ReturnType<typeof createTestAuth>, email: string) {
  const { headers, response } = await auth.api.signUpEmail({
    body: { email, password: 'password-1234', name: email.split('@')[0]! },
    returnHeaders: true,
  })
  const cookie = headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
  return { userId: response.user.id, headers: { cookie } }
}
