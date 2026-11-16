import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'

import { AuthSession } from '#/lib/auth/client'

export type AuthProvider = 'google' | 'github'
export type PendingAction = 'email' | AuthProvider | 'passkey' | null

/**
 * What the sign-in and sign-up pages share: one action in flight at a time,
 * one message to show, Google/GitHub redirects, and leaving once signed in.
 */
export function useAuthActions(input: {
  destination: string
  returnPath: '/login' | '/signup'
  initialError?: string | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState<PendingAction>(null)
  const [error, setError] = useState(input.initialError ?? '')
  const [notice, setNotice] = useState('')

  const clearMessages = () => {
    setError('')
    setNotice('')
  }

  const finish = async () => {
    AuthSession.invalidate()
    await router.navigate({ href: input.destination, replace: true })
  }

  /** Runs one action; others are ignored until it settles. Return a message to show it as an error. */
  const run = async (action: Exclude<PendingAction, null>, work: () => Promise<string | null | void>) => {
    if (pending) return
    clearMessages()
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

  return { pending, error, notice, setError, setNotice, clearMessages, finish, run, social }
}
