import { VStack } from '@astryxdesign/core/VStack'
import { Grid, GridSpan } from '@astryxdesign/core/Grid'
import { TextInput } from '@astryxdesign/core/TextInput'
import { ProfileBlock } from '#/components/settings/ProfileParts'
import PasskeysSettingsBlock from '#/components/settings/PasskeysSettingsBlock'
import ProfileNameBlock from '#/components/settings/ProfileNameBlock'
import ProfilePictureBlock from '#/components/settings/ProfilePictureBlock'
import { ProfileDangerBlock, ProfilePasswordBlock } from '#/components/settings/ProfileSecurityBlocks'
import SettingsSkeleton from '#/components/settings/SettingsSkeleton'
import { useCurrentUser, useLinkedAccounts } from '#/hooks/use-current-user'

/** Cap line length; inputs use full width up to this edge. */
const PROFILE_FIELDS_MAX_WIDTH = 560

const PROVIDER_LABEL = { google: 'Google', github: 'GitHub' } as const

/** The Profile settings page: picture, name, email, password, passkeys and account deletion. */
export default function ProfileSettingsFields() {
  const { user, isLoading } = useCurrentUser()
  const accounts = useLinkedAccounts()

  if (isLoading || !user) {
    return <SettingsSkeleton count={4} label="Loading your profile…" />
  }

  const linked = accounts.data
  const hasPassword = linked?.hasPassword ?? false
  const providerNames = (linked?.providers ?? []).map((p) => PROVIDER_LABEL[p])

  return (
    <VStack
      gap={8}
      hAlign="stretch"
      width="fill"
      style={{ width: '100%', maxWidth: PROFILE_FIELDS_MAX_WIDTH }}
    >
      <ProfilePictureBlock user={user} />
      <ProfileNameBlock user={user} />

      <ProfileBlock
        title="Email"
        description="Your sign-in email cannot be changed here."
      >
        <Grid columns={2} gap={4} width="100%">
          <GridSpan columns="full">
            <TextInput
              type="email"
              label="Email address"
              size="sm"
              width="100%"
              value={user.email}
              isReadOnly
              controlStyle={{ cursor: 'default', pointerEvents: 'none' }}
            />
          </GridSpan>
        </Grid>
      </ProfileBlock>

      <ProfilePasswordBlock
        hasPassword={hasPassword}
        isPending={accounts.isPending}
        isError={accounts.isError}
        providerNames={providerNames}
      />

      <ProfileBlock
        title="Passkeys"
        description="Sign in with Face ID, Touch ID, Windows Hello or a security key instead of a password."
      >
        <PasskeysSettingsBlock />
      </ProfileBlock>

      <ProfileDangerBlock email={user.email} hasPassword={hasPassword} isPending={accounts.isPending} />
    </VStack>
  )
}
