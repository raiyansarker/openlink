import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Badge } from '@astryxdesign/core/Badge'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useEffect, useState, type FormEvent } from 'react'

import { createClient, errorMessage, isUnauthorized } from '../lib/client'
import { OVERLAY_COMMAND } from '../lib/overlay'
import { loadSettings, normalizeOrigin, originPattern, updateSettings, type KeyWorkspace } from '../lib/settings'

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; message: string } | { kind: 'warning'; message: string } | { kind: 'error'; message: string }

export default function OptionsApp() {
  const [origin, setOrigin] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [keyWorkspace, setKeyWorkspace] = useState<KeyWorkspace | undefined>()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [shortcut, setShortcut] = useState('')

  useEffect(() => {
    void loadSettings().then((saved) => {
      setOrigin(saved.origin ?? '')
      setKeyWorkspace(saved.apiKeyWorkspace)
    })
    void chrome.commands.getAll().then((commands) => {
      setShortcut(commands.find((c) => c.name === OVERLAY_COMMAND)?.shortcut ?? '')
    })
  }, [])

  /** Connect: host access for the app, then the key names the workspace it acts for. */
  async function connect(event: FormEvent) {
    event.preventDefault()
    const normalized = normalizeOrigin(origin)
    if (!normalized) return setStatus({ kind: 'error', message: 'Enter a valid http(s) URL for the app.' })
    const secret = apiKey.trim()
    if (!secret.startsWith('sk_')) return setStatus({ kind: 'warning', message: 'OpenLink API keys start with “sk_” — create one in the app under Settings → API keys.' })
    setStatus({ kind: 'busy' })
    try {
      const granted = await chrome.permissions.request({ origins: [originPattern(normalized)] })
      if (!granted) return setStatus({ kind: 'error', message: 'Access to the app origin was not granted.' })
      const info = await createClient(normalized, secret).apiKeys.getCurrentApiKey()
      const workspace: KeyWorkspace = {
        organizationId: info.organization.id,
        name: info.organization.name,
        slug: info.organization.slug,
        role: info.role,
        apiKey: secret,
      }
      const next = await updateSettings((current) => ({ ...current, origin: normalized, apiKeyWorkspace: workspace }))
      setOrigin(normalized)
      setApiKey('')
      setKeyWorkspace(next.apiKeyWorkspace)
      setStatus({ kind: 'ok', message: `Connected — ${workspace.name} (${workspace.role}).` })
    } catch (error) {
      setStatus({
        kind: isUnauthorized(error) ? 'warning' : 'error',
        message: isUnauthorized(error)
          ? 'That key was not accepted — it may be revoked. Create a fresh one in the app under Settings → API keys.'
          : errorMessage(error, 'Could not reach the app with that key. Check the URL; if the app predates this, its API needs the current-key endpoint.'),
      })
    }
  }

  async function removeKey() {
    const next = await updateSettings((current) => ({ ...current, apiKeyWorkspace: undefined }))
    setKeyWorkspace(next.apiKeyWorkspace)
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
            Point the extension at your OpenLink app and connect it with a workspace API key — the extension never uses the browser's sign-in session.
          </Text>
        </VStack>

        <form onSubmit={connect}>
          <VStack gap={4} hAlign="stretch">
            <TextInput label="App URL" type="url" placeholder="https://links.example.com" value={origin} onChange={setOrigin} width="100%" isRequired />
            <TextInput
              label="API key"
              type="password"
              placeholder="sk_…"
              value={apiKey}
              onChange={setApiKey}
              width="100%"
              isRequired
              description="Create a key in the app under Settings → API keys. Member role or higher can create links."
            />
            <Button type="submit" variant="primary" size="lg" label="Connect" width="100%" isLoading={status.kind === 'busy'} />
            {status.kind === 'ok' && <Banner status="success" title={status.message} />}
            {status.kind === 'warning' && <Banner status="warning" title={status.message} />}
            {status.kind === 'error' && <Banner status="error" title={status.message} />}
          </VStack>
        </form>

        {keyWorkspace && (
          <HStack hAlign="between" vAlign="center" width="100%">
            <VStack gap={0} hAlign="start">
              <Text weight="medium">{keyWorkspace.name}</Text>
              <Text type="supporting" size="sm">
                {keyWorkspace.role} · {keyWorkspace.apiKey.slice(0, 9)}…
              </Text>
            </VStack>
            <HStack gap={2} vAlign="center">
              {appOrigin && <Badge variant="success" label="Connected" />}
              <Button variant="ghost" size="sm" label="Remove" onClick={() => void removeKey()} />
            </HStack>
          </HStack>
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
