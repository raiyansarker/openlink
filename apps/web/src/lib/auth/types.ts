export type AuthUser = {
  id: string
  name: string
  email: string
  image: string | null
  /** False until the person creates or joins their first workspace. */
  onboarded: boolean
}

export type SocialProvider = 'google' | 'github'

export type AuthProviders = Record<SocialProvider, boolean>

export type AuthState = {
  user: AuthUser | null
  providers: AuthProviders
  /** Whether email and password sign-in is enabled. */
  emailPassword: boolean
}
