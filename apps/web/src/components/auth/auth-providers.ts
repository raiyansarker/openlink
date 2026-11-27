import type { AuthProvider } from './use-auth-actions'

/** Whether any social sign-in provider is turned on. */
export function hasProviders(providers: Record<AuthProvider, boolean>) {
  return providers.google || providers.github
}
