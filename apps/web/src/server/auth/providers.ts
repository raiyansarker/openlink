import type { WorkerBindings } from '#/server/env'

export type SocialProvider = 'google' | 'github'

type ProviderEnv = Pick<
  WorkerBindings,
  'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GITHUB_CLIENT_ID' | 'GITHUB_CLIENT_SECRET'
>

/** OAuth providers, switched on by configuration. */
export class SocialProviders {
  static readonly ALL: readonly SocialProvider[] = ['google', 'github']

  private static filled(value: string | undefined) {
    return value?.trim() ? value.trim() : undefined
  }

  /**
   * A provider is enabled only when both its id and secret are present, so a
   * half-configured provider never shows a login button that cannot work.
   */
  static config(env: ProviderEnv) {
    const google = {
      id: SocialProviders.filled(env.GOOGLE_CLIENT_ID),
      secret: SocialProviders.filled(env.GOOGLE_CLIENT_SECRET),
    }
    const github = {
      id: SocialProviders.filled(env.GITHUB_CLIENT_ID),
      secret: SocialProviders.filled(env.GITHUB_CLIENT_SECRET),
    }
    return {
      ...(google.id && google.secret ? { google: { clientId: google.id, clientSecret: google.secret } } : {}),
      ...(github.id && github.secret ? { github: { clientId: github.id, clientSecret: github.secret } } : {}),
    }
  }

  static enabled(env: ProviderEnv): Record<SocialProvider, boolean> {
    const config = SocialProviders.config(env)
    return { google: 'google' in config, github: 'github' in config }
  }
}

/** Email and password sign-in: on unless `EMAIL_PASSWORD_SIGN_IN` is exactly "false". */
export class EmailPasswordSignIn {
  static enabled(env: { EMAIL_PASSWORD_SIGN_IN?: string }): boolean {
    return env.EMAIL_PASSWORD_SIGN_IN?.trim().toLowerCase() !== 'false'
  }
}
