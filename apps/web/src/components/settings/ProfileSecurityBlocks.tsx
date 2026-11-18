import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/VStack'
import ChangePasswordDialog from '#/components/settings/ChangePasswordDialog'
import DeleteAccountDialog from '#/components/settings/DeleteAccountDialog'
import { ProfileBlock, Status } from '#/components/settings/ProfileParts'

type PasswordBlockProps = {
  hasPassword: boolean
  /** Still checking how the user signs in. */
  isPending: boolean
  isError: boolean
  /** Names of the connected sign-in providers, for the no-password message. */
  providerNames: string[]
}

/** Change the password, or explain why there isn't one. */
export function ProfilePasswordBlock({ hasPassword, isPending, isError, providerNames }: PasswordBlockProps) {
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null)
  const [passwordOpen, setPasswordOpen] = useState(false)

  return (
    <>
      <ProfileBlock
        title="Password"
        description={
          isPending
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
        {isError ? <Status message="Could not load your sign-in methods." tone="error" /> : null}
      </ProfileBlock>
      <ChangePasswordDialog
        isOpen={passwordOpen}
        onOpenChange={setPasswordOpen}
        onChanged={() => setPasswordNotice('Password changed. Other devices were signed out.')}
      />
    </>
  )
}

type DangerBlockProps = {
  email: string
  hasPassword: boolean
  /** Still checking how the user signs in. */
  isPending: boolean
}

/** Delete the account. */
export function ProfileDangerBlock({ email, hasPassword, isPending }: DangerBlockProps) {
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <ProfileBlock
        title="Danger zone"
        description="Deleting your account removes your profile and sign-in methods. You must first transfer or delete any workspace you own."
      >
        <Button
          variant="destructive"
          size="sm"
          label="Delete account"
          isDisabled={isPending}
          onClick={() => setDeleteOpen(true)}
        />
      </ProfileBlock>
      <DeleteAccountDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        email={email}
        hasPassword={hasPassword}
        onDeleted={() => void navigate({ to: '/login', replace: true })}
      />
    </>
  )
}
