export type AuthUser = {
  id: string
  name: string
  email: string
  image: string | null
}

export type SocialProvider = 'google' | 'github'

export type AuthProviders = Record<SocialProvider, boolean>

export type AuthState = {
  user: AuthUser | null
  providers: AuthProviders
}
