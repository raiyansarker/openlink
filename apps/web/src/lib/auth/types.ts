export type AuthUser = {
  id: string
  name: string
  email: string
  image: string | null
}

export type AuthProviders = { google: boolean; github: boolean }

export type AuthState = {
  user: AuthUser | null
  providers: AuthProviders
}
