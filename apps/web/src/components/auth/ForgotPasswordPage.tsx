import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useNotify } from '#/hooks/use-notify'
import { AuthSession } from '#/lib/auth/client'
import { AuthErrorMessages } from '#/lib/auth/error-messages'
import { fieldStatus, requiredEmail, submitWith } from '#/lib/forms/fields'
import { isPlainClick } from './auth-links'
import AuthShell from './AuthShell'
import StatusPanel from './StatusPanel'

const ForgotPasswordSchema = type({
  email: requiredEmail({ required: 'Enter your email address.', invalid: 'Enter a valid email address.' }),
})

/** Asks for an email address and sends a reset link. The answer is the same whether or not an account exists. */
export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const notify = useNotify()
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: '' },
    validators: { onSubmit: ForgotPasswordSchema },
    onSubmit: async ({ value }) => {
      if (pending) return
      setPending(true)
      try {
        const email = value.email.trim()
        const { error } = await AuthSession.client.requestPasswordReset({ email, redirectTo: '/reset-password' })
        const message = AuthErrorMessages.requestReset(error)
        if (message) notify.error(message)
        else setSentTo(email)
      } catch {
        notify.error(AuthErrorMessages.requestReset({ status: 500 })!)
      } finally {
        setPending(false)
      }
    },
  })

  const toLogin = (event: React.MouseEvent) => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    void navigate({ to: '/login' })
  }

  return (
    <AuthShell
      heading={sentTo ? 'Check your email' : 'Forgot your password?'}
      subheading={sentTo ? 'The link is valid for one hour.' : 'Enter your email and we will send you a link to choose a new one.'}
      switchTo={{ prompt: 'Remembered it?', label: 'Log in', to: '/login' }}
    >
      {sentTo ? (
        <StatusPanel
          actions={
            <>
              <Button variant="secondary" label="Use a different email" width="100%" onClick={() => setSentTo(null)} />
              <Button variant="ghost" label="Back to sign in" width="100%" href="/login" onClick={toLogin} />
            </>
          }
        >
          If an account exists for {sentTo}, a reset link is on its way. It can take a minute to arrive.
        </StatusPanel>
      ) : (
        <form method="post" noValidate onSubmit={submitWith(form)}>
          <VStack gap={4} hAlign="stretch">
            <form.Field name="email">
              {(field) => (
                <TextInput
                  label="Email address"
                  type="email"
                  placeholder="you@company.com"
                  value={field.state.value}
                  onChange={field.handleChange}
                  status={fieldStatus(field.state.meta.errors)}
                  autoComplete="email"
                  autoCapitalize="none"
                  hasSpellCheck={false}
                  htmlName="email"
                  width="100%"
                  isRequired
                />
              )}
            </form.Field>
            <Button
              label="Send reset link"
              variant="primary"
              type="submit"
              width="100%"
              isLoading={pending}
              isDisabled={pending}
              endContent={<Icon icon="chevronRight" size="sm" />}
            />
          </VStack>
        </form>
      )}
    </AuthShell>
  )
}
