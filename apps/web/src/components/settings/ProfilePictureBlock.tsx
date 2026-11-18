import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import {
  PictureHelpCaption,
  ProfileBlock,
  Status,
  type CurrentUser,
} from '#/components/settings/ProfileParts'
import { useRefreshCurrentUser } from '#/hooks/use-current-user'
import { apiErrorMessage } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import { SquareImage } from '#/lib/media/square-image'

const PICTURE_HELP = 'PNG, JPG, WebP, or GIF up to 10 MB. We crop it to a square.'

/** Upload, replace or remove the profile picture. */
export default function ProfilePictureBlock({ user }: { user: CurrentUser }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const refresh = useRefreshCurrentUser()
  const updateProfile = useMutation(orpc.account.updateMyProfile.mutationOptions())
  const [pictureStatus, setPictureStatus] = useState<string | null>(null)
  const [isSavingPicture, setIsSavingPicture] = useState(false)

  const savePicture = async (image: Blob | null) => {
    setIsSavingPicture(true)
    setPictureStatus(null)
    try {
      await updateProfile.mutateAsync({ body: { image } })
      await refresh()
    } catch (e) {
      setPictureStatus(apiErrorMessage(e, 'Could not update your picture.'))
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

  return (
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
  )
}
