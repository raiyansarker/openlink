import { Button } from '@astryxdesign/core/Button'
import { Grid } from '@astryxdesign/core/Grid'
import { PasskeyIcon, ProviderIcon } from './auth-icons'
import type { AuthProvider, PendingAction } from './use-auth-actions'

type ProviderButtonsProps = {
  providers: Record<AuthProvider, boolean>
  pending: PendingAction
  onSocial: (provider: AuthProvider) => void
  /** Sign-in only: passkeys can't create an account. */
  onPasskey?: () => void
}

const LABELS: Record<AuthProvider, string> = { google: 'Google', github: 'GitHub' }

/** Google, GitHub and (on sign-in) Passkey, side by side. Rendered on the server so the row never shifts. */
export default function ProviderButtons({ providers, pending, onSocial, onPasskey }: ProviderButtonsProps) {
  const enabled = (['google', 'github'] as const).filter((name) => providers[name])
  const count = enabled.length + (onPasskey ? 1 : 0)
  if (count === 0) return null
  return (
    // One row when there's room; buttons wrap rather than truncate on narrow screens.
    <Grid columns={{ minWidth: 100, max: count }} gap={3}>
      {enabled.map((name) => (
        <Button
          key={name}
          label={LABELS[name]}
          size="md"
          width="100%"
          icon={<ProviderIcon provider={name} />}
          isLoading={pending === name}
          isDisabled={pending !== null}
          onClick={() => onSocial(name)}
        />
      ))}
      {onPasskey ? (
        <Button
          label="Passkey"
          tooltip="Sign in with a passkey"
          size="md"
          width="100%"
          icon={<PasskeyIcon />}
          isLoading={pending === 'passkey'}
          isDisabled={pending !== null}
          onClick={onPasskey}
        />
      ) : null}
    </Grid>
  )
}

export function hasProviders(providers: Record<AuthProvider, boolean>) {
  return providers.google || providers.github
}
