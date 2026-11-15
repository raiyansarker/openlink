import type { WorkerBindings } from '#/server/env'

export type SocialProvider = 'google' | 'github'
export const SOCIAL_PROVIDERS: readonly SocialProvider[] = ['google', 'github']

type ProviderEnv = Pick<
  WorkerBindings,
  'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET'
>

const filled = (value: string | undefined) => (value?.trim() ? value.trim() : undefined)

/**
 * A provider is enabled only when both its id and secret are present, so a
 * half-configured provider never shows a login button that cannot work.
 */
export function socialProviderConfig(env: ProviderEnv) {
  const google = { id: filled(env.GOOGLE_CLIENT_ID), secret: filled(env.GOOGLE_CLIENT_SECRET) }
  const github = { id: filled(env.GITHUB_CLIENT_ID), secret: filled(env.GITHUB_CLIENT_SECRET) }
  return {
    ...(google.id && google.secret ? { google: { clientId: google.id, clientSecret: google.secret } } : {}),
    ...(github.id && github.secret ? { github: { clientId: github.id, clientSecret: github.secret } } : {}),
  }
}

export function enabledSocialProviders(env: ProviderEnv): Record<SocialProvider, boolean> {
  const config = socialProviderConfig(env)
  return { google: 'google' in config, github: 'github' in config }
}
