import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Avatar } from '@astryxdesign/core/Avatar'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { SettingsBlock } from '#/components/settings/WorkspaceSettingsParts'
import { useOrganization } from '#/contexts/OrganizationContext'
import { useWorkspaceDirectory } from '#/contexts/WorkspaceDirectoryContext'
import { apiErrorMessage } from '#/lib/api/errors'
import { orpc } from '#/lib/api/orpc'
import { SquareImage } from '#/lib/media/square-image'

const LOGO_ACCEPT = SquareImage.ACCEPT

/** Upload, replace or remove the workspace logo. `name` is what the placeholder initials spell. */
export default function WorkspaceLogoBlock({ name }: { name: string }) {
  const { activeOrg } = useOrganization()
  const { invalidate: refreshWorkspaces } = useWorkspaceDirectory()
  const fileRef = useRef<HTMLInputElement>(null)
  const logoSrc = activeOrg.logoUrl ?? null
  const canEditLogo = activeOrg.role === 'owner' || activeOrg.role === 'admin'
  const [logoError, setLogoError] = useState<string | null>(null)
  const [isSavingLogo, setIsSavingLogo] = useState(false)
  const updateWorkspace = useMutation(orpc.organizations.updateOrganization.mutationOptions({ onSuccess: refreshWorkspaces }))

  /** Replace (or remove, with null) the logo through the workspace API; the list refreshes on success. */
  const saveLogo = async (file: File | null) => {
    if (fileRef.current) fileRef.current.value = ''
    setLogoError(null)
    setIsSavingLogo(true)
    try {
      const logo = file ? await SquareImage.fromFile(file) : null
      await updateWorkspace.mutateAsync({ params: { organizationId: activeOrg.id }, body: { logo } })
    } catch (error) {
      setLogoError(apiErrorMessage(error, 'The logo could not be saved.'))
    } finally {
      setIsSavingLogo(false)
    }
  }

  const onLogoFile = (file: File | undefined) => {
    if (file) void saveLogo(file)
  }

  const removeLogo = () => void saveLogo(null)

  return (
    <SettingsBlock title="Logo" description="Shown in the workspace switcher.">
      <HStack gap={4} vAlign="center" wrap="wrap">
        <Avatar src={logoSrc ?? undefined} name={name} size={64} shape="rounded" tooltip={false} />
        <VStack gap={1} hAlign="start">
          <HStack gap={2} vAlign="center">
            <Button
              variant="secondary"
              size="sm"
              label={logoSrc ? 'Replace' : 'Upload'}
              isLoading={isSavingLogo}
              isDisabled={!canEditLogo}
              onClick={() => {
                setLogoError(null)
                fileRef.current?.click()
              }}
            />
            {logoSrc ? (
              <Button variant="ghost" size="sm" label="Remove" onClick={removeLogo} isDisabled={!canEditLogo || isSavingLogo} />
            ) : null}
          </HStack>
          <Text
            type="supporting"
            color={logoError ? 'primary' : 'secondary'}
            role={logoError ? 'alert' : undefined}
          >
            {logoError ??
              (canEditLogo ? 'PNG, JPG, WebP, or GIF up to 10 MB. We crop it to a square.' : 'Only owners and admins can change the logo.')}
          </Text>
        </VStack>
      </HStack>
      <input
        ref={fileRef}
        type="file"
        accept={LOGO_ACCEPT}
        tabIndex={-1}
        aria-hidden
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          border: 0,
        }}
        onChange={(event) => onLogoFile(event.target.files?.[0])}
      />
    </SettingsBlock>
  )
}
