import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useNotify } from '#/hooks/use-notify'
import { AuthSession } from '#/lib/auth/client'
import { isPlainClick } from './auth-links'
import { CheckInboxIllustration } from './AuthIllustrations'
import AuthShell from './AuthShell'

/** Matches the server: one verification email per address per minute. */
const RESEND_INTERVAL_MS = 60 * 1000

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

type CheckEmailPageProps = {
  /** From the signed pending-verification cookie, never from the URL. */
  email: string
  /** When another link may be requested (epoch ms; 0 = now), also from the cookie. */
  resendAt: number
}

/**
 * Shown after sign-up, or after signing in before verifying. It never sends an email by
 * itself: sign-up already did, and a sign-in only reminds. "Send a new link" asks for one.
 */
export default function CheckEmailPage({ email, resendAt: initialResendAt }: CheckEmailPageProps) {
  const navigate = useNavigate()
  const notify = useNotify()
  const [pending, setPending] = useState(false)
  const [resendAt, setResendAt] = useState(initialResendAt)
  useEffect(() => setResendAt(initialResendAt), [initialResendAt])
  const secondsLeft = useSecondsUntil(resendAt)

  const resend = async () => {
    if (pending || secondsLeft > 0) return
    setPending(true)
    try {
      const { error } = await AuthSession.client.sendVerificationEmail({ email, callbackURL: '/verify-email' })
      if (error?.status === 429) return void notify.error('Too many requests. Wait a minute, then try again.')
      if (error) return void notify.error('Could not send a new link. Please try again.')
      setResendAt(Date.now() + RESEND_INTERVAL_MS)
      // The server caps links per address and answers the same either way, so this cannot promise one went out.
      notify.info('If your email still needs verifying, a new link is on its way. We send at most a few an hour.')
    } catch {
      notify.error('Could not send a new link. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const toLogin = (event: React.MouseEvent) => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    void navigate({ to: '/login' })
  }

  return (
    <AuthShell
      heading="Check your inbox"
      subheading={`We sent a verification link to ${email}.`}
      switchTo={{ prompt: 'Already verified?', label: 'Log in', to: '/login' }}
      illustration={<CheckInboxIllustration />}
    >
      <VStack gap={5} hAlign="stretch">
        <Text color="secondary" size="sm" justify="center" role="status">
          Open the link in that email to verify your address and sign in. Links expire after an hour. Can’t find it? Check
          your spam folder, or send a new one.
        </Text>
        <VStack gap={2} hAlign="stretch">
          <Button
            variant="primary"
            width="100%"
            label={secondsLeft > 0 ? `Send a new link in ${secondsLeft}s` : 'Send a new link'}
            isLoading={pending}
            isDisabled={pending || secondsLeft > 0}
            onClick={() => void resend()}
          />
          <Button variant="ghost" width="100%" label="Back to sign in" href="/login" onClick={toLogin} />
        </VStack>
      </VStack>
    </AuthShell>
  )
}
