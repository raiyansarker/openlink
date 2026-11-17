import { useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { useNotify } from '#/hooks/use-notify'
import { AuthSession } from '#/lib/auth/client'

export type AuthProvider = 'google' | 'github'
export type PendingAction = 'email' | AuthProvider | 'passkey' | null

/**
 * What the sign-in and sign-up pages share: one action in flight at a time,
 * messages shown as toasts, Google/GitHub redirects, and leaving once signed in.
 */
export function useAuthActions(input: {
  destination: string
  returnPath: '/login' | '/signup'
  initialError?: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState<PendingAction>(null)
  const notify = useNotify()
  const setError = notify.error
  const setNotice = notify.info

  // An error the page was opened with (e.g. a failed Google/GitHub sign-in).
  useEffect(() => {
    if (input.initialError) notify.error(input.initialError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finish = async () => {
    AuthSession.invalidate()
    await router.navigate({ href: input.destination, replace: true })
  }

  /** Runs one action; others are ignored until it settles. Return a message to show it as an error. */
  const run = async (action: Exclude<PendingAction, null>, work: () => Promise<string | null | void>) => {
    if (pending) return
    setPending(action)
    try {
      const message = await work()
      if (message) setError(message)
    } finally {
      setPending(null)
    }
  }

  const social = (provider: AuthProvider) =>
    run(provider, async () => {
      try {
        // On success the browser goes to the provider; nothing to do here.
        const { error: socialError } = await AuthSession.client.signIn.social({
          provider,
          callbackURL: input.destination,
          errorCallbackURL: `${input.returnPath}?redirect=${encodeURIComponent(input.destination)}`,
        })
        if (socialError) return 'Could not start sign-in. Please try again.'
        // Keep the button busy while the browser leaves for the provider.
        await new Promise(() => {})
      } catch {
        return 'Could not start sign-in. Please try again.'
      }
    })

  return { pending, setError, setNotice, finish, run, social }
}
