import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Badge } from '@astryxdesign/core/Badge'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { createClient, errorMessage, isUnauthorized } from '../lib/client'
import { OVERLAY_COMMAND } from '../lib/overlay'
import { loadSettings, normalizeOrigin, originPattern, updateSettings } from '../lib/settings'

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; message: string } | { kind: 'warning'; message: string } | { kind: 'error'; message: string }

/** What the app said about the browser's sign-in session. */
type Session = 'checking' | 'signed-in' | 'signed-out'

/** The connected API-key workspace, for the options page's summary row. */
type KeySummary = { name: string; role: string } | null

export default function OptionsApp() {
  const [origin, setOrigin] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [keyWorkspace, setKeyWorkspace] = useState<KeySummary>(null)
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
      setKeyWorkspace(saved.apiKeyWorkspace ? { name: saved.apiKeyWorkspace.name, role: saved.apiKeyWorkspace.role } : null)
      void checkSession(saved.origin ?? '')
    })
    void chrome.commands.getAll().then((commands) => {
      setShortcut(commands.find((c) => c.name === OVERLAY_COMMAND)?.shortcut ?? '')
    })
  }, [checkSession])

  /**
   * A sign-in that happens in another tab (the login page Connect opened, say)
   * must show up here without a reload. Cookie-store events for the app's
   * domain — and coming back to this tab — re-check the session, debounced
   * because a sign-in touches several cookies at once.
   */
  useEffect(() => {
    if (!origin || !normalizeOrigin(origin)) return
    const host = new URL(origin).hostname
    let retry: number | undefined
    const recheck = () => {
      window.clearTimeout(retry)
      retry = window.setTimeout(() => void checkSession(origin), 300)
    }
    const onCookieChange = (change: chrome.cookies.CookieChangeInfo) => {
      const domain = change.cookie.domain.replace(/^\./, '')
      if (host === domain || host.endsWith(`.${domain}`)) recheck()
    }
    const onFocus = () => recheck()
    chrome.cookies.onChanged.addListener(onCookieChange)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(retry)
      chrome.cookies.onChanged.removeListener(onCookieChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [origin, checkSession])

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
        setStatus({ kind: 'ok', message: `Signed in — connected to ${new URL(normalized).host}.` })
      } catch {
        // No session for the app: say so and take the user to where they can create one.
        setSession('signed-out')
        setStatus({ kind: 'warning', message: 'Not signed in — the login page opened in a new tab.' })
        await chrome.tabs.create({ url: `${normalized}/login` })
      }
    } catch (error) {
      setStatus({ kind: 'error', message: errorMessage(error, 'Could not save the app URL.') })
    }
  }

  /** Connects with one of the app's API keys instead of the browser session:
   * the endpoint names the workspace the key acts for. */
  async function connectKey(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeOrigin(origin)
    if (!normalized) return setStatus({ kind: 'error', message: 'Enter a valid http(s) URL for the app.' })
    const secret = apiKeyInput.trim()
    if (!secret.startsWith('sk_')) return setStatus({ kind: 'warning', message: 'OpenLink API keys start with “sk_” — create one in the app under Settings → API keys.' })
    setStatus({ kind: 'busy' })
    try {
      const granted = await chrome.permissions.request({ origins: [originPattern(normalized)] })
      if (!granted) return setStatus({ kind: 'error', message: 'Access to the app origin was not granted.' })
      const info = await createClient(normalized, secret).apiKeys.getCurrentApiKey()
      await updateSettings((current) => ({
        ...current,
        origin: normalized,
        apiKeyWorkspace: {
          organizationId: info.organization.id,
          name: info.organization.name,
          slug: info.organization.slug,
          role: info.role,
          apiKey: secret,
        },
      }))
      setOrigin(normalized)
      setApiKeyInput('')
      setKeyWorkspace({ name: info.organization.name, role: info.role })
      setStatus({ kind: 'ok', message: `Connected with an API key — ${info.organization.name} (${info.role}).` })
    } catch (error) {
      setStatus({
        kind: isUnauthorized(error) ? 'warning' : 'error',
        message: isUnauthorized(error)
          ? 'That key was not accepted — it may be revoked. Create a fresh one in the app under Settings → API keys.'
          : errorMessage(error, 'Could not reach the app with that key.'),
      })
    }
  }

  async function removeKey() {
    await updateSettings((current) => ({ ...current, apiKeyWorkspace: undefined }))
    setKeyWorkspace(null)
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
            Point the extension at your OpenLink app. Connect with the browser's sign-in session, or paste a workspace API key below to work without signing in.
          </Text>
        </VStack>

        <form onSubmit={connect}>
          <VStack gap={4} hAlign="stretch">
            <TextInput label="App URL" type="url" placeholder="https://links.example.com" value={origin} onChange={setOrigin} width="100%" isRequired />
            <Button type="submit" variant="primary" size="lg" label="Connect" width="100%" isLoading={status.kind === 'busy'} />
          </VStack>
        </form>

        <form onSubmit={connectKey}>
          <VStack gap={4} hAlign="stretch">
            <TextInput
              label="API key (optional)"
              type="password"
              placeholder="sk_…"
              value={apiKeyInput}
              onChange={setApiKeyInput}
              width="100%"
              description="Work without signing in: paste a key created in the app under Settings → API keys. It names the workspace it acts for."
            />
            <Button
              type="submit"
              variant="secondary"
              label="Connect with API key"
              width="100%"
              isDisabled={!apiKeyInput.trim() || status.kind === 'busy'}
            />
            {status.kind === 'ok' && <Banner status="success" title={status.message} />}
            {status.kind === 'warning' && <Banner status="warning" title={status.message} />}
            {status.kind === 'error' && <Banner status="error" title={status.message} />}
          </VStack>
        </form>

        {keyWorkspace && (
          <HStack hAlign="between" vAlign="center" width="100%">
            <VStack gap={0} hAlign="start">
              <Text weight="medium">API key · {keyWorkspace.name}</Text>
              <Text type="supporting" size="sm">
                {keyWorkspace.role} · used instead of the browser session
              </Text>
            </VStack>
            <Button variant="ghost" size="sm" label="Remove" onClick={() => void removeKey()} />
          </HStack>
        )}

        {appOrigin && (
          <VStack gap={3} hAlign="stretch" width="100%">
            <HStack hAlign="between" vAlign="center" width="100%">
              <VStack gap={0} hAlign="start">
                <Text weight="medium">{new URL(appOrigin).host}</Text>
                <Text type="supporting" size="sm">
                  {session === 'signed-in' ? 'Sign-in session active (used when no API key is connected)' : session === 'signed-out' ? 'Not signed in' : 'Checking…'}
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
