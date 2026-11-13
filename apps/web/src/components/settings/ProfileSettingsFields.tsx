import { useRef, useState, type ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Grid, GridSpan } from '@astryxdesign/core/Grid'
import { Button } from '@astryxdesign/core/Button'
import { Avatar } from '@astryxdesign/core/Avatar'
import { DEMO_USER_AVATAR_URL } from '#/components/dashboard/layout/dashboard-shell-colors'

const EMAIL = 'raiyan@example.com'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

const PICTURE_HELP = 'We support PNG, JPG, or GIF portraits under 5 MB.'

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

export default function ProfileSettingsFields() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [firstName, setFirstName] = useState('Raiyan')
  const [lastName, setLastName] = useState('Sarker')
  const [avatarSrc, setAvatarSrc] = useState<string | null>(DEMO_USER_AVATAR_URL)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || 'User'

  const openFilePicker = () => {
    setUploadError(null)
    fileRef.current?.click()
  }

  const onAvatarFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a PNG, JPG, or GIF image.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setUploadError('That file is larger than 5 MB. Choose a smaller portrait.')
      return
    }
    setUploadError(null)
    const url = URL.createObjectURL(file)
    setAvatarSrc((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return url
    })
  }

  const removeAvatar = () => {
    setUploadError(null)
    setAvatarSrc((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <VStack
      gap={8}
      hAlign="stretch"
      width="fill"
      style={{ width: '100%', maxWidth: PROFILE_FIELDS_MAX_WIDTH }}
    >
      <ProfileBlock title="Picture">
        <HStack gap={4} vAlign="start" wrap="wrap">
          <Avatar
            src={avatarSrc ?? undefined}
            name={fullName}
            size={72}
            shape="rounded"
            tooltip={false}
          />
          <VStack gap={2} hAlign="start">
            <HStack gap={2} vAlign="center" wrap="wrap">
              <Button
                variant="secondary"
                size="sm"
                label="Upload"
                onClick={openFilePicker}
              />
              <Button
                variant="ghost"
                size="sm"
                label="Remove"
                onClick={removeAvatar}
                isDisabled={!avatarSrc}
              />
            </HStack>
            <PictureHelpCaption>{PICTURE_HELP}</PictureHelpCaption>
            {uploadError ? (
              <Text type="supporting" color="primary">
                {uploadError}
              </Text>
            ) : null}
          </VStack>
        </HStack>
        <input
          ref={fileRef}
          type="file"
          accept={AVATAR_ACCEPT}
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
          onChange={(e) => {
            const file = e.target.files?.[0]
            onAvatarFile(file)
          }}
        />
      </ProfileBlock>

      <ProfileBlock
        title="Name"
        description="Your first and last name appear on your profile and in workspaces you join."
      >
        <Grid columns={2} gap={4} width="100%">
          <TextInput
            label="First name"
            size="sm"
            width="100%"
            placeholder="First name"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
          />
          <TextInput
            label="Last name"
            size="sm"
            width="100%"
            placeholder="Last name"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
          />
        </Grid>
      </ProfileBlock>

      <ProfileBlock
        title="Email"
        description="Your sign-in email is managed by your account provider and cannot be changed here."
      >
        <Grid columns={2} gap={4} width="100%">
          <GridSpan columns="full">
            <TextInput
              type="email"
              label="Email address"
              size="sm"
              width="100%"
              placeholder="you@example.com"
              value={EMAIL}
              isReadOnly
              controlStyle={{
                cursor: 'default',
                pointerEvents: 'none',
              }}
            />
          </GridSpan>
        </Grid>
      </ProfileBlock>

      <ProfileBlock
        title="Password"
        description="Use a strong password you do not reuse on other sites."
      >
        <HStack gap={2} vAlign="center" wrap="wrap">
          <Button
            variant="secondary"
            size="sm"
            label="Change password"
            onClick={() => {}}
          />
        </HStack>
      </ProfileBlock>

      <ProfileBlock
        title="Danger zone"
        description="Deleting your account permanently removes your profile and personal data. This cannot be undone."
      >
        <Button
          variant="destructive"
          size="sm"
          label="Delete account"
          onClick={() => {}}
        />
      </ProfileBlock>
    </VStack>
  )
}
