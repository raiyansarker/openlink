import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useNotify } from '#/hooks/use-notify'
import { AuthSession } from '#/lib/auth/client'

/** Matches the server: one verification email per address per minute. */
const RESEND_COOLDOWN_SECONDS = 60

/** Seconds left until `until` (ms), ticking once a second. */
function useSecondsUntil(until: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (until <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [until])
  return Math.max(0, Math.ceil((until - now) / 1000))
}

type CheckInboxPanelProps = {
  email: string
  onBack: () => void
}

/**
 * Shown after sign-up, or when someone signs in before verifying their email. Both just
 * asked for a link, so resending starts on cooldown. The server limits emails too and
 * answers the same whether or not one went out, so the copy never promises a new email.
 */
export default function CheckInboxPanel({ email, onBack }: CheckInboxPanelProps) {
  const notify = useNotify()
  const [pending, setPending] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState(() => Date.now() + RESEND_COOLDOWN_SECONDS * 1000)
  const secondsLeft = useSecondsUntil(cooldownUntil)

  const resend = async () => {
    if (pending || secondsLeft > 0) return
    setPending(true)
    try {
      const { error } = await AuthSession.client.sendVerificationEmail({ email, callbackURL: '/verify-email' })
      if (error?.status === 429) notify.error('Too many requests. Wait a minute, then try again.')
      else if (error) notify.error('Could not send a new link. Please try again.')
      else notify.info('If your email still needs verifying, a new link is on its way.')
    } catch {
      notify.error('Could not send a new link. Please try again.')
    } finally {
      setCooldownUntil(Date.now() + RESEND_COOLDOWN_SECONDS * 1000)
      setPending(false)
    }
  }

  return (
    <VStack gap={5} hAlign="stretch">
      <Text color="secondary" size="sm" justify="center" role="status">
        Open the link in the email to verify your address and sign in. Links expire after an hour. Can’t find it?
        Check your spam folder, or send a new one.
      </Text>
      <VStack gap={2} hAlign="stretch">
        <Button
          variant="primary"
          width="100%"
          label={secondsLeft > 0 ? `Resend link in ${secondsLeft}s` : 'Resend link'}
          isLoading={pending}
          isDisabled={pending || secondsLeft > 0}
          onClick={() => void resend()}
        />
        <Button variant="ghost" width="100%" label="Back to sign in" onClick={onBack} />
      </VStack>
    </VStack>
  )
}
