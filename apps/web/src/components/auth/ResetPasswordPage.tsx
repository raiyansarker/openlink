import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { VStack } from '@astryxdesign/core/VStack'
import PasswordField from '#/components/common/PasswordField'
import { useNotify } from '#/hooks/use-notify'
import { AuthSession } from '#/lib/auth/client'
import { AuthErrorMessages } from '#/lib/auth/error-messages'
import { fieldStatus, requiredExact, submitWith } from '#/lib/forms/fields'
import { isPlainClick } from './auth-links'
import AuthShell from './AuthShell'
import StatusPanel from './StatusPanel'

const ResetPasswordSchema = type({ password: requiredExact('Enter a new password.') })

type ResetPasswordPageProps = {
  /** From the link in the email; missing or rejected links show the "request a new one" state. */
  token?: string
  linkError?: string
}

/** The page the reset email links to: choose a new password, then sign in with it. */
export default function ResetPasswordPage({ token, linkError }: ResetPasswordPageProps) {
  const navigate = useNavigate()
  const notify = useNotify()
  const [pending, setPending] = useState(false)

  const form = useForm({
    defaultValues: { password: '' },
    validators: { onSubmit: ResetPasswordSchema },
    onSubmit: async ({ value }) => {
      if (pending || !token) return
      setPending(true)
      try {
        const { error } = await AuthSession.client.resetPassword({ newPassword: value.password, token })
        if (error) {
          notify.error(AuthErrorMessages.resetPassword(error))
          return
        }
        AuthSession.invalidate()
        notify.info('Password updated. Sign in with your new password.')
        await navigate({ to: '/login', replace: true })
      } catch {
        notify.error(AuthErrorMessages.resetPassword(undefined))
      } finally {
        setPending(false)
      }
    },
  })

  const go = (to: '/login' | '/forgot-password') => (event: React.MouseEvent) => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    void navigate({ to })
  }

  const linkIsUsable = Boolean(token) && !linkError

  return (
    <AuthShell
      heading={linkIsUsable ? 'Choose a new password' : 'This link has expired'}
      subheading={linkIsUsable ? 'Use at least 8 characters.' : 'Reset links work once and expire after an hour.'}
      switchTo={{ prompt: 'Remembered it?', label: 'Log in', to: '/login' }}
    >
      {linkIsUsable ? (
        <form method="post" noValidate onSubmit={submitWith(form)}>
          <VStack gap={4} hAlign="stretch">
            <form.Field name="password">
              {(field) => (
                <PasswordField
                  label="New password"
                  placeholder="At least 8 characters"
                  value={field.state.value}
                  onChange={field.handleChange}
                  status={fieldStatus(field.state.meta.errors)}
                  autoComplete="new-password"
                  htmlName="password"
                  isRequired
                />
              )}
            </form.Field>
            <Button
              label="Update password"
              variant="primary"
              type="submit"
              width="100%"
              isLoading={pending}
              isDisabled={pending}
              endContent={<Icon icon="chevronRight" size="sm" />}
            />
          </VStack>
        </form>
      ) : (
        <StatusPanel
          actions={
            <>
              <Button variant="primary" label="Request a new link" width="100%" href="/forgot-password" onClick={go('/forgot-password')} />
              <Button variant="ghost" label="Back to sign in" width="100%" href="/login" onClick={go('/login')} />
            </>
          }
        >
          The link you followed is no longer valid. Request a new one to continue.
        </StatusPanel>
      )}
    </AuthShell>
  )
}
