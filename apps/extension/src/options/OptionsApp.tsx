import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Badge } from '@astryxdesign/core/Badge'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { createClient, errorMessage } from '../lib/client'
import { OVERLAY_COMMAND } from '../lib/overlay'
import { loadSettings, normalizeOrigin, originPattern, updateSettings } from '../lib/settings'

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; message: string } | { kind: 'error'; message: string }

/** Whether the browser holds a sign-in session for the app. */
type Session = 'checking' | 'signed-in' | 'signed-out'

export default function OptionsApp() {
  const [origin, setOrigin] = useState('')
  const [session, setSession] = useState<Session>('checking')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [shortcut, setShortcut] = useState('')

  const checkSession = useCallback(async (appOrigin: string) => {
    if (!appOrigin) return setSession('signed-out')
    setSession('checking')
    try {
      await createClient(appOrigin).organizations.listOrganizations()
      setSession('signed-in')
    } catch {
      // Anything but a session success reads as "no working session here".
      setSession('signed-out')
    }
  }, [])

  useEffect(() => {
    void loadSettings().then((saved) => {
      setOrigin(saved.origin ?? '')
      void checkSession(saved.origin ?? '')
    })
    void chrome.commands.getAll().then((commands) => {
      setShortcut(commands.find((c) => c.name === OVERLAY_COMMAND)?.shortcut ?? '')
    })
  }, [checkSession])

  /** Grants host access to the app (its cookies make the requests), then verifies
   * the session: signed in says connected; signed out opens the app's login page. */
  async function connect(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeOrigin(origin)
    if (!normalized) return setStatus({ kind: 'error', message: 'Enter a valid http(s) URL for the app.' })
    setStatus({ kind: 'busy' })
    try {
      const granted = await chrome.permissions.request({ origins: [originPattern(normalized)] })
      if (!granted) return setStatus({ kind: 'error', message: 'Access to the app origin was not granted.' })
      await updateSettings((current) => ({ ...current, origin: normalized }))
      setOrigin(normalized)
      setSession('checking')
      try {
        await createClient(normalized).organizations.listOrganizations()
        setSession('signed-in')
        setStatus({ kind: 'ok', message: `Connected to ${new URL(normalized).host}.` })
      } catch {
        // Connected, but the extension works through the browser's sign-in
        // session — take the user straight to where they can create one.
        setSession('signed-out')
        setStatus({ kind: 'ok', message: 'Connected — finish signing in to the app in the tab that opened.' })
        await chrome.tabs.create({ url: `${normalized}/login` })
      }
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error, 'Could not save the app URL.') })
    }
  }

  const appOrigin = normalizeOrigin(origin)

  return (
    <VStack
      as="main"
      gap={0}
      hAlign="center"
      vAlign="center"
      width="100%"
      padding={6}
      style={{ minHeight: '100dvh', background: 'var(--color-background-surface)' }}
    >
      <VStack gap={6} hAlign="stretch" width="100%" maxWidth={440}>
        <VStack gap={1} hAlign="stretch">
          <Heading level={1}>OpenLink</Heading>
          <Text type="supporting">
            Point the extension at your OpenLink app. It uses the browser's sign-in session for that app, so there is nothing to paste.
          </Text>
        </VStack>

        <form onSubmit={connect}>
          <VStack gap={4} hAlign="stretch">
            <TextInput label="App URL" type="url" placeholder="https://links.example.com" value={origin} onChange={setOrigin} width="100%" isRequired />
            <Button type="submit" variant="primary" size="lg" label="Connect" width="100%" isLoading={status.kind === 'busy'} />
            {status.kind === 'ok' && <Banner status="success" title={status.message} />}
            {status.kind === 'error' && <Banner status="error" title={status.message} />}
          </VStack>
        </form>

        {appOrigin && (
          <VStack gap={3} hAlign="stretch" width="100%">
            <HStack hAlign="between" vAlign="center" width="100%">
              <VStack gap={0} hAlign="start">
                <Text weight="medium">{new URL(appOrigin).host}</Text>
                <Text type="supporting" size="sm">
                  {session === 'signed-in' ? 'Sign-in session active' : session === 'signed-out' ? 'Not signed in' : 'Checking…'}
                </Text>
              </VStack>
              {session === 'signed-in' ? (
                <Badge variant="success" label="Connected" />
              ) : (
                <Button variant="secondary" size="sm" label="Open the app" href={appOrigin} target="_blank" />
              )}
            </HStack>
            {session === 'signed-out' && (
              <Banner
                status="warning"
                title="Not signed in"
                description="Open the app and sign in with your account; the extension follows that session."
              />
            )}
          </VStack>
        )}

        <HStack hAlign="between" vAlign="center" gap={3}>
          <VStack gap={0} hAlign="start">
            <Text weight="medium">Shorten this page</Text>
            <Text type="supporting" size="sm">
              {shortcut || 'No shortcut set'}
            </Text>
          </VStack>
          <Button label="Change" onClick={() => void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })} />
        </HStack>
      </VStack>
    </VStack>
  )
}
