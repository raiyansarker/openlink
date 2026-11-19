import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { Button } from '@astryxdesign/core/Button'
import { Icon } from '@astryxdesign/core/Icon'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useNotify } from '#/hooks/use-notify'
import { AuthSession } from '#/lib/auth/client'
import { VerificationSends } from '#/lib/auth/verification-sends'
import { fieldStatus, requiredEmail, submitWith } from '#/lib/forms/fields'
import { isPlainClick } from './auth-links'
import { CheckInboxIllustration } from './AuthIllustrations'
import AuthShell from './AuthShell'

const RequestSchema = type({
  email: requiredEmail({ required: 'Enter your email address.', invalid: 'Enter a valid email address.' }),
})

/** Seconds left until `until` (epoch ms), ticking once a second while it counts down. */
function useSecondsUntil(until: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    if (until <= Date.now()) return
    const timer = window.setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= until) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}

/**
 * Where people land after signing up, or after signing in before verifying. It never sends
 * an email on its own: the sign-up already did, and a sign-in only reminds. "Send a new link"
 * asks for one. The server limits sends and answers the same whether or not one went out.
 *
 * `/check-email?email=…` can be shared or reloaded; without `email` it asks for the address.
 */
export default function CheckEmailPage({ email }: { email?: string }) {
  const navigate = useNavigate()
  const notify = useNotify()
  const [pending, setPending] = useState(false)
  // Read after mount: sessionStorage does not exist during server rendering.
  const [resendAt, setResendAt] = useState(0)
  useEffect(() => setResendAt(email ? VerificationSends.resendAt(email) : 0), [email])
  const secondsLeft = useSecondsUntil(resendAt)

  const requestLink = async (to: string) => {
    setPending(true)
    try {
      const { error } = await AuthSession.client.sendVerificationEmail({ email: to, callbackURL: '/verify-email' })
      if (error?.status === 429) return void notify.error('Too many requests. Wait a minute, then try again.')
      if (error) return void notify.error('Could not send a new link. Please try again.')
      VerificationSends.record(to)
      setResendAt(VerificationSends.resendAt(to))
      notify.info('If that email still needs verifying, a new link is on its way.')
      if (to !== email) await navigate({ to: '/check-email', search: { email: to }, replace: true })
    } catch {
      notify.error('Could not send a new link. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const form = useForm({
    defaultValues: { email: '' },
    validators: { onSubmit: RequestSchema },
    onSubmit: ({ value }) => (pending ? undefined : requestLink(value.email.trim())),
  })

  const toLogin = (event: React.MouseEvent) => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    void navigate({ to: '/login' })
  }

  return (
    <AuthShell
      heading={email ? 'Check your inbox' : 'Verify your email'}
      subheading={email ? `We sent a verification link to ${email}.` : 'Enter your email and we will send you a new verification link.'}
      switchTo={{ prompt: 'Already verified?', label: 'Log in', to: '/login' }}
      illustration={<CheckInboxIllustration />}
    >
      {email ? (
        <VStack gap={5} hAlign="stretch">
          <Text color="secondary" size="sm" justify="center" role="status">
            Open the link in that email to verify your address and sign in. Links expire after an hour. Can’t find it?
            Check your spam folder, or send a new one.
          </Text>
          <VStack gap={2} hAlign="stretch">
            <Button
              variant="primary"
              width="100%"
              label={secondsLeft > 0 ? `Send a new link in ${secondsLeft}s` : 'Send a new link'}
              isLoading={pending}
              isDisabled={pending || secondsLeft > 0}
              onClick={() => void requestLink(email)}
            />
            <Button
              variant="secondary"
              width="100%"
              label="Use a different email"
              onClick={() => void navigate({ to: '/check-email', search: {}, replace: true })}
            />
            <Button variant="ghost" width="100%" label="Back to sign in" href="/login" onClick={toLogin} />
          </VStack>
        </VStack>
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
              label="Send verification link"
              variant="primary"
              type="submit"
              width="100%"
              isLoading={pending}
              isDisabled={pending}
              endContent={<Icon icon="chevronRight" size="sm" />}
            />
            <Button variant="ghost" width="100%" label="Back to sign in" href="/login" onClick={toLogin} />
          </VStack>
        </form>
      )}
    </AuthShell>
  )
}
