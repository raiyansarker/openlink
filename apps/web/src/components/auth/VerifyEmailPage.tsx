import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { AuthSession } from '#/lib/auth/client'
import { isPlainClick } from './auth-links'
import { EmailVerifiedIllustration, LinkExpiredIllustration } from './AuthIllustrations'
import AuthShell from './AuthShell'
import Confetti from './Confetti'
import StatusPanel from './StatusPanel'

/** Where the verification email lands. A good link has already signed the person in. */
export default function VerifyEmailPage({ linkError }: { linkError?: string }) {
  const navigate = useNavigate()

  // Verifying signs the person in, so the cached "signed out" state is stale.
  useEffect(() => {
    if (!linkError) AuthSession.invalidate()
  }, [linkError])

  const go = (to: '/login' | '/w') => (event: React.MouseEvent) => {
    if (!isPlainClick(event)) return
    event.preventDefault()
    void navigate({ to })
  }

  return (
    <AuthShell
      heading={linkError ? 'This link has expired' : 'Email verified'}
      subheading={linkError ? 'Verification links expire after an hour.' : 'Your account is ready.'}
      switchTo={{ prompt: 'Already verified?', label: 'Log in', to: '/login' }}
      illustration={linkError ? <LinkExpiredIllustration /> : <EmailVerifiedIllustration />}
    >
      {linkError ? null : <Confetti />}
      {linkError ? (
        <StatusPanel actions={<Button variant="primary" label="Back to sign in" width="100%" href="/login" onClick={go('/login')} />}>
          Sign in with your email and password and we will send you a fresh verification link.
        </StatusPanel>
      ) : (
        <StatusPanel actions={<Button variant="primary" label="Continue to OpenLink" width="100%" href="/w" onClick={go('/w')} />}>
          Thanks for confirming your email address.
        </StatusPanel>
      )}
    </AuthShell>
  )
}
