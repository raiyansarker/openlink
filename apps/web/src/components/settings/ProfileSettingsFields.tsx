import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Grid, GridSpan } from '@astryxdesign/core/Grid'
import { Button } from '@astryxdesign/core/Button'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Spinner } from '@astryxdesign/core/Spinner'

import ChangePasswordDialog from '#/components/settings/ChangePasswordDialog'
import PasskeysSettingsBlock from '#/components/settings/PasskeysSettingsBlock'
import DeleteAccountDialog from '#/components/settings/DeleteAccountDialog'
import { useCurrentUser, useLinkedAccounts, useRefreshCurrentUser } from '#/hooks/use-current-user'
import { ProfileApi, ProfileError } from '#/lib/profile/api'
import { SquareImage } from '#/lib/media/square-image'
import { MediaUploads } from '#/lib/media/uploads'
import { FormFields } from '#/lib/forms/fields'
import { ProfileRules } from '#/lib/profile/rules'

const ProfileNameSchema = type({
  name: type('string').narrow((value, ctx) => {
    const check = ProfileRules.name(value)
    return check.ok || ctx.reject({ message: check.message })
  }),
})

const PICTURE_HELP = 'PNG, JPG, WebP, or GIF up to 10 MB. We crop it to a square.'

/** Cap line length; inputs use full width up to this edge. */
const PROFILE_FIELDS_MAX_WIDTH = 560

function MutedCaption({ children }: { children: ReactNode }) {
  return (
    <Text type="supporting" color="secondary">
      {children}
    </Text>
  )
}

function PictureHelpCaption({ children }: { children: ReactNode }) {
  return (
    <Text
      type="supporting"
      color="secondary"
      style={{ fontSize: 11, lineHeight: 1.45, maxWidth: 280 }}
    >
      {children}
    </Text>
  )
}

function ProfileBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <VStack gap={2} hAlign="start" width="fill">
      <VStack gap={0.5} hAlign="start" width="fill">
        <Heading level={4} weight="bold">
          {title}
        </Heading>
        {description ? <MutedCaption>{description}</MutedCaption> : null}
      </VStack>
      {children}
    </VStack>
  )
}

const PROVIDER_LABEL = { google: 'Google', github: 'GitHub' } as const

function Status({ message, tone }: { message: string; tone: 'error' | 'info' }) {
  return (
    <Text type="supporting" weight={tone === 'error' ? 'medium' : undefined} color={tone === 'info' ? 'secondary' : undefined} role={tone === 'error' ? 'alert' : 'status'}>
      {message}
    </Text>
  )
}

export default function ProfileSettingsFields() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const { user, isLoading } = useCurrentUser()
  const refresh = useRefreshCurrentUser()
  const accounts = useLinkedAccounts()

  const [nameSaved, setNameSaved] = useState(false)
  const [pictureStatus, setPictureStatus] = useState<string | null>(null)
  const [isSavingPicture, setIsSavingPicture] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const nameForm = useForm({
    defaultValues: { name: user?.name ?? '' },
    validators: {
      onSubmit: ProfileNameSchema,
      onSubmitAsync: async ({ value }) => {
        const check = ProfileRules.name(value.name)
        if (!check.ok) return { fields: { name: check.message } }
        try {
          await ProfileApi.updateProfile({ name: check.value })
          await refresh()
          setNameSaved(true)
          return undefined
        } catch (e) {
          return { fields: { name: e instanceof ProfileError ? e.message : 'Could not save your name.' } }
        }
      },
    },
  })

  // Start from the saved name, and follow it if it changes elsewhere.
  useEffect(() => {
    if (user) nameForm.reset({ name: user.name })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name])

  if (isLoading || !user) {
    return <Spinner size="md" label="Loading your profile…" />
  }

  const savePicture = async (image: Blob | null) => {
    setIsSavingPicture(true)
    setPictureStatus(null)
    try {
      if (image) await MediaUploads.setAvatar(image)
      else await MediaUploads.clearAvatar()
      await refresh()
    } catch (e) {
      setPictureStatus(e instanceof Error ? e.message : 'Could not update your picture.')
    } finally {
      setIsSavingPicture(false)
    }
  }

  const onAvatarFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    let image: Blob
    try {
      image = await SquareImage.fromFile(file)
    } catch (e) {
      setPictureStatus(e instanceof Error ? e.message : 'That picture could not be used.')
      return
    }
    await savePicture(image)
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
      <ProfileBlock title="Picture">
        <HStack gap={4} vAlign="start" wrap="wrap">
          <Avatar src={user.image ?? undefined} name={user.name} size={72} shape="rounded" tooltip={false} />
          <VStack gap={2} hAlign="start">
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Button
                variant="secondary"
                size="sm"
                label="Upload"
                isLoading={isSavingPicture}
                onClick={() => {
                  setPictureStatus(null)
                  fileRef.current?.click()
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                label="Remove"
                onClick={() => void savePicture(null)}
                isDisabled={!user.image || isSavingPicture}
              />
            </HStack>
            <PictureHelpCaption>{PICTURE_HELP}</PictureHelpCaption>
            {pictureStatus ? <Status message={pictureStatus} tone="error" /> : null}
          </VStack>
        </HStack>
        <input
          ref={fileRef}
          type="file"
          accept={SquareImage.ACCEPT}
          tabIndex={-1}
          aria-hidden
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
          onChange={(e) => void onAvatarFile(e.target.files?.[0])}
        />
      </ProfileBlock>

      <ProfileBlock title="Name" description="Shown on your profile and to people in workspaces you join.">
        <form
          style={{ width: '100%' }}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void nameForm.handleSubmit()
          }}
        >
          <VStack gap={2} hAlign="start" width="100%">
            <nameForm.Field name="name">
              {(field) => (
                <TextInput
                  label="Full name"
                  size="sm"
                  width="100%"
                  value={field.state.value}
                  onChange={(value) => {
                    setNameSaved(false)
                    field.handleChange(value)
                  }}
                  autoComplete="name"
                  status={FormFields.status(field.state.meta.errors)}
                />
              )}
            </nameForm.Field>
            <nameForm.Subscribe
              selector={(state) => [state.values.name, state.isSubmitting] as const}
            >
              {([name, isSubmitting]) => (
                <HStack gap={3} vAlign="center">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    label="Save"
                    isDisabled={name.trim().replace(/\s+/g, ' ') === user.name}
                    isLoading={isSubmitting}
                  />
                  {nameSaved ? <Status message="Saved." tone="info" /> : null}
                </HStack>
              )}
            </nameForm.Subscribe>
          </VStack>
        </form>
      </ProfileBlock>

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

      <ProfileBlock
        title="Password"
        description={
          accounts.isPending
            ? 'Checking how you sign in…'
            : hasPassword
              ? 'Use a strong password you do not reuse on other sites.'
              : `You sign in with ${providerNames.join(' or ') || 'a connected account'}, so there is no password to change.`
        }
      >
        {hasPassword ? (
          <VStack gap={2} hAlign="start">
            <Button
              variant="secondary"
              size="sm"
              label="Change password"
              onClick={() => {
                setPasswordNotice(null)
                setPasswordOpen(true)
              }}
            />
            {passwordNotice ? <Status message={passwordNotice} tone="info" /> : null}
          </VStack>
        ) : null}
        {accounts.isError ? <Status message="Could not load your sign-in methods." tone="error" /> : null}
      </ProfileBlock>

      <ProfileBlock
        title="Passkeys"
        description="Sign in with Face ID, Touch ID, Windows Hello or a security key instead of a password."
      >
        <PasskeysSettingsBlock />
      </ProfileBlock>

      <ProfileBlock
        title="Danger zone"
        description="Deleting your account removes your profile and sign-in methods. You must first transfer or delete any workspace you own."
      >
        <Button
          variant="destructive"
          size="sm"
          label="Delete account"
          isDisabled={accounts.isPending}
          onClick={() => setDeleteOpen(true)}
        />
      </ProfileBlock>

      <ChangePasswordDialog
        isOpen={passwordOpen}
        onOpenChange={setPasswordOpen}
        onChanged={() => setPasswordNotice('Password changed. Other devices were signed out.')}
      />
      <DeleteAccountDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        email={user.email}
        hasPassword={hasPassword}
        onDeleted={() => void navigate({ to: '/login', replace: true })}
      />
    </VStack>
  )
}
