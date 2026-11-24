import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'
import { List, ListItem } from '@astryxdesign/core/List'
import { Selector } from '@astryxdesign/core/Selector'
import { Skeleton } from '@astryxdesign/core/Skeleton'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'

import { createClient, errorMessage, isUnauthorized, type OpenLinkClient } from '../lib/client'
import { clearCache, loadCache, saveCache, type LinkCache } from '../lib/cache'
import { loadSettings, updateSettings, type ConnectedWorkspace } from '../lib/settings'
import FolderPicker, { ROOT, folderPath, type Folder } from './FolderPicker'
import { CheckIcon, ChevronRightIcon, CloseIcon, CopyIcon, FolderIcon, SettingsIcon } from './icons'

/** Only `active` domains have finished DNS checks; the dashboard keeps those out of the picker too. */
export type Domain = { id: string; hostname: string; readiness: 'pending' | 'verifying' | 'active' | 'failed' | 'removing' }
export type RecentLink = { id: string; slug: string; title?: string; domainId: string | null; destinationUrl: string }

const APP_HOST = ''
const LOGO_URL = chrome.runtime.getURL('images/icon-48.png')

type Session =
  | { state: 'loading' }
  | { state: 'unconfigured' }
  /** Signed out of the app: the extension rides the browser's sign-in session. */
  | { state: 'signed-out'; origin: string }
  | { state: 'signed-in-empty'; origin: string }
  | { state: 'unreachable'; origin: string; message: string }
  | { state: 'ready'; origin: string; workspaces: ConnectedWorkspace[]; organizationId: string; initial?: LinkCache }

export type LinkAppProps = {
  /** The page being shortened: the active tab, or the page the shortcut was pressed on. */
  initialUrl: string
  initialTitle: string
  /** Set when shown over a page; adds a close button. */
  onClose?: () => void
}

function toWorkspace(m: { organization: { id: string; name: string; slug: string }; role: ConnectedWorkspace['role'] }): ConnectedWorkspace {
  return { organizationId: m.organization.id, name: m.organization.name, slug: m.organization.slug, role: m.role }
}

/** Shorten a page: pick workspace, folder and domain, then create. Used by the popup and the page overlay. */
export default function LinkApp(props: LinkAppProps) {
  const [session, setSession] = useState<Session>({ state: 'loading' })
  // Serializes loads: only the newest run may set the session, so a stale
  // in-flight refresh can never overwrite a fresher result.
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    const apply = (next: Session) => {
      if (seq === loadSeq.current) setSession(next)
    }
    const saved = await loadSettings()
    if (seq !== loadSeq.current) return
    if (!saved.origin) return apply({ state: 'unconfigured' })
    // Paint the last known state at once; the server's answer below is the truth.
    const cache = await loadCache()
    if (seq !== loadSeq.current) return
    if (cache && cache.origin === saved.origin && cache.workspaces.length > 0) {
      const active = cache.workspaces.find((w) => w.organizationId === saved.activeOrganizationId) ?? cache.workspaces[0]!
      apply({ state: 'ready', origin: saved.origin, workspaces: cache.workspaces, organizationId: active.organizationId, initial: cache })
    }
    const client = createClient(saved.origin)
    try {
      const { items } = await client.organizations.listOrganizations()
      if (seq !== loadSeq.current) return
      const workspaces = items.map(toWorkspace)
      if (workspaces.length === 0) {
        void clearCache()
        return apply({ state: 'signed-in-empty', origin: saved.origin })
      }
      const active = workspaces.find((w) => w.organizationId === saved.activeOrganizationId) ?? workspaces[0]!
      apply({ state: 'ready', origin: saved.origin, workspaces, organizationId: active.organizationId, ...(cache ? { initial: cache } : {}) })
    } catch (e) {
      if (seq !== loadSeq.current) return
      // The server always wins over the cache: a refused request means signed
      // out, an unreachable app means unreachable — never show the stale form.
      if (isUnauthorized(e)) {
        void clearCache()
        return apply({ state: 'signed-out', origin: saved.origin })
      }
      apply({ state: 'unreachable', origin: saved.origin, message: errorMessage(e, 'Could not reach the app.') })
    }
  }, [])

  useEffect(() => {
    void load()
    // Origin changes made in settings show up without reopening. Only settings:
    // the panel writes its own cache to storage, which must not wake it.
    const onChange = (changes: Record<string, unknown>, area: string) => {
      if (area === 'local' && 'settings' in changes) void load()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [load])

  async function selectWorkspace(organizationId: string) {
    if (session.state !== 'ready') return
    setSession({ ...session, organizationId })
    await updateSettings((current) => ({ ...current, activeOrganizationId: organizationId }))
  }

  switch (session.state) {
    case 'loading':
      return (
        <Panel onClose={props.onClose}>
          <VStack gap={3} hAlign="stretch" width="100%">
            <Skeleton height={32} radius="rounded" width="100%" />
            <Skeleton height={18} radius="rounded" width="45%" />
            <Skeleton height={18} radius="rounded" width="70%" />
            <Skeleton height={32} radius="rounded" width="40%" />
          </VStack>
        </Panel>
      )
    case 'unconfigured':
      return (
        <Panel onClose={props.onClose}>
          <Text type="supporting">Set the OpenLink app in settings to start shortening links.</Text>
          <Button variant="primary" size="lg" label="Open settings" onClick={() => void chrome.runtime.openOptionsPage()} />
        </Panel>
      )
    case 'signed-out':
      return (
        <Panel onClose={props.onClose}>
          <Text type="supporting">
            The extension uses the browser's sign-in session for {session.origin}. Sign in there once and reopen this panel.
          </Text>
          <Button variant="primary" size="lg" label="Open the app" onClick={() => void chrome.tabs.create({ url: session.origin })} />
        </Panel>
      )
    case 'signed-in-empty':
      return (
        <Panel onClose={props.onClose}>
          <Text type="supporting">Create a workspace in the app first; the extension files short links into it.</Text>
          <Button variant="primary" size="lg" label="Open the app" onClick={() => void chrome.tabs.create({ url: session.origin })} />
        </Panel>
      )
    case 'unreachable':
      return (
        <Panel onClose={props.onClose}>
          <Banner status="error" title={session.message} description={`Check that ${session.origin} is the right app URL, then retry.`} />
          <HStack gap={2}>
            <Button label="Retry" onClick={() => void load()} />
            <Button label="Settings" onClick={() => void chrome.runtime.openOptionsPage()} />
          </HStack>
        </Panel>
      )
    case 'ready': {
      const workspace = session.workspaces.find((w) => w.organizationId === session.organizationId)!
      return (
        <Shortener
          // A new workspace starts a fresh form, still aimed at the current page.
          key={session.organizationId}
          {...props}
          origin={session.origin}
          workspaces={session.workspaces}
          workspace={workspace}
          {...(session.initial ? { initial: session.initial } : {})}
          onSelectWorkspace={(id) => void selectWorkspace(id)}
        />
      )
    }
  }
}

function Header({ onClose }: { onClose?: () => void }) {
  return (
    <HStack hAlign="between" vAlign="center" gap={3} width="100%">
      <HStack gap={2} vAlign="center">
        <img src={LOGO_URL} alt="" width={24} height={24} />
        <Heading level={3}>OpenLink</Heading>
      </HStack>
      <HStack gap={1} vAlign="center">
        <IconButton
          variant="ghost"
          size="sm"
          icon={<Icon icon={SettingsIcon} />}
          label="Settings"
          tooltip="Settings"
          onClick={() => void chrome.runtime.openOptionsPage()}
        />
        {onClose && <IconButton variant="ghost" size="sm" icon={<Icon icon={CloseIcon} />} label="Close" tooltip="Close" onClick={onClose} />}
      </HStack>
    </HStack>
  )
}

/** The card: header and content; the page body carries the surface color,
 * so short states are exactly as tall as their content, nothing more. */
function Panel({ children, footer, onClose }: { children?: ReactNode; footer?: ReactNode; onClose?: (() => void) | undefined }) {
  return (
    <VStack gap={0} hAlign="stretch" width="100%" style={{ background: 'var(--color-background-surface)' }}>
      <VStack gap={4} hAlign="stretch" width="100%" padding={4}>
        <Header {...(onClose ? { onClose } : {})} />
        {children}
      </VStack>
      {footer}
    </VStack>
  )
}

function Shortener({
  origin,
  workspaces,
  workspace,
  initial,
  onSelectWorkspace,
  initialUrl,
  initialTitle,
  onClose,
}: LinkAppProps & {
  origin: string
  workspaces: ConnectedWorkspace[]
  workspace: ConnectedWorkspace
  /** Last shown state for this workspace; lets the form paint instantly. */
  initial?: LinkCache
  onSelectWorkspace: (id: string) => void
}) {
  const { organizationId } = workspace
  const client = useMemo(() => createClient(origin), [origin])

  const [view, setView] = useState<'form' | 'folders'>('form')
  const [destinationUrl, setDestinationUrl] = useState(initialUrl)
  const [title, setTitle] = useState(initialTitle)
  const [slug, setSlug] = useState('')
  const [tags, setTags] = useState('')
  const [folderId, setFolderId] = useState(ROOT)
  const [domainId, setDomainId] = useState(APP_HOST)
  const [domains, setDomains] = useState<Domain[]>(initial?.organizationId === organizationId ? initial.domains : [])
  const [folders, setFolders] = useState<Folder[]>(initial?.organizationId === organizationId ? initial.folders : [])
  const [recent, setRecent] = useState<RecentLink[]>(initial?.organizationId === organizationId ? initial.recent : [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  // Kept in a ref so a workspaces update never re-runs the detail fetch.
  const workspacesRef = useRef(workspaces)
  workspacesRef.current = workspaces
  // Fresh-enough cache means an open costs no network at all.
  const [skipsRefresh] = useState(() => (initial ? Date.now() - initial.savedAt < 30_000 : false))

  // The shortcut (or popup) always aims at the page it was opened on.
  useEffect(() => {
    setDestinationUrl(initialUrl)
    setTitle(initialTitle)
  }, [initialUrl, initialTitle])

  const shortUrlFor = useCallback(
    (linkSlug: string, linkDomainId: string | null) => {
      const domain = linkDomainId ? domains.find((d) => d.id === linkDomainId) : undefined
      return domain ? `https://${domain.hostname}/${linkSlug}` : `${origin}/${linkSlug}`
    },
    [domains, origin],
  )

  const refreshRecent = useCallback(
    async (api: OpenLinkClient) => {
      const { items } = await api.links.listOrganizationLinks({ params: { organizationId }, query: { limit: '2' } })
      return items
    },
    [organizationId],
  )

  useEffect(() => {
    // Details arrive together (or not at all): the form never pops in bit by bit.
    if (skipsRefresh) return
    let alive = true
    void Promise.all([
      client.domains.listDomains({ params: { organizationId } }).then(({ items }) => items, () => undefined),
      client.folders.listFolders({ params: { organizationId } }).then(({ items }) => items, () => undefined),
      refreshRecent(client).catch(() => undefined),
    ]).then(([freshDomains, freshFolders, freshRecent]) => {
      if (!alive || freshDomains === undefined) return
      setDomains(freshDomains)
      setFolders(freshFolders ?? [])
      setRecent(freshRecent ?? [])
      void saveCache({
        origin,
        organizationId,
        workspaces: workspacesRef.current,
        domains: freshDomains,
        folders: freshFolders ?? [],
        recent: freshRecent ?? [],
        savedAt: Date.now(),
      })
    })
    return () => {
      alive = false
    }
    // The cache saved by the last refresh feeds the next paint via `initial`.
  }, [client, organizationId, origin, refreshRecent, skipsRefresh])

  async function refreshRecentQuietly() {
    try {
      const items = await refreshRecent(client)
      setRecent(items)
      void saveCache({ origin, organizationId, workspaces, domains, folders, recent: items, savedAt: Date.now() })
    } catch {
      // The link was created; a failed re-listing is not worth an error.
    }
  }

  async function createFolder(name: string, parentId: string): Promise<Folder> {
    try {
      const folder = await client.folders.createFolder({
        params: { organizationId },
        body: { name, ...(parentId ? { parentId } : {}) },
      })
      setFolders((current) => [...current, folder])
      return folder
    } catch (e) {
      throw new Error(errorMessage(e, 'Could not create the folder.'))
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setCreated(null)
    try {
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)
      const link = await client.links.createWorkspaceLink({
        params: { organizationId },
        body: {
          destinationUrl: destinationUrl.trim(),
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(slug.trim() ? { slug: slug.trim() } : {}),
          ...(domainId ? { domainId } : {}),
          ...(folderId ? { folderId } : {}),
          ...(tagList.length ? { tags: tagList } : {}),
        },
      })
      const url = shortUrlFor(link.slug, link.domainId)
      setCreated(url)
      setSlug('')
      await copy(url).catch(() => undefined)
      void refreshRecentQuietly()
    } catch (e) {
      setError(
        isUnauthorized(e)
          ? 'The session was not accepted. Sign in to the app again, then retry.'
          : errorMessage(e, 'Could not create the link.'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(url)
  }

  if (view === 'folders') {
    return (
      <Panel onClose={onClose}>
        <FolderPicker
          folders={folders}
          selected={folderId}
          onCreate={createFolder}
          onBack={() => setView('form')}
          onSelect={(id) => {
            setFolderId(id)
            setView('form')
          }}
        />
      </Panel>
    )
  }

  return (
    <Panel
      onClose={onClose}
      footer={
        recent.length > 0 ? (
          <RecentLinks
            links={recent}
            shortUrlFor={shortUrlFor}
            linkPage={(id) => `${origin}/w/${workspace.slug}/links/${id}`}
            copied={copied}
            onCopy={(url) => void copy(url)}
          />
        ) : null
      }
    >
      <form onSubmit={onSubmit}>
        <VStack gap={3} hAlign="stretch" width="100%">
          {workspace.role === 'viewer' && (
            <Banner status="warning" title="Viewers can’t create links" description="Ask a workspace admin for a member or admin role." />
          )}
          <Selector
            label="Workspace"
            value={organizationId}
            onChange={onSelectWorkspace}
            options={workspaces.map((w) => ({ value: w.organizationId, label: w.name }))}
          />
          <TextInput label="Destination" type="url" value={destinationUrl} onChange={setDestinationUrl} width="100%" isRequired />
          <TextInput label="Title" value={title} onChange={setTitle} width="100%" isOptional />

          <VStack gap={1} hAlign="stretch">
            <Text type="label">Folder</Text>
            <Button variant="secondary" width="100%" label={`Folder: ${folderPath(folders, folderId)}`} onClick={() => setView('folders')}>
              <HStack gap={2} vAlign="center" width="100%">
                <Icon icon={FolderIcon} size="sm" color="secondary" />
                <Text maxLines={1} style={{ flex: 1, textAlign: 'start' }}>
                  {folderPath(folders, folderId)}
                </Text>
                <Icon icon={ChevronRightIcon} size="sm" color="secondary" />
              </HStack>
            </Button>
          </VStack>

          {domains.length > 0 && (
            <Selector
              label="Domain"
              value={domainId}
              onChange={setDomainId}
              options={[
                { value: APP_HOST, label: new URL(origin).host, description: 'Served by this app' },
                ...domains.map((d) => ({
                  value: d.id,
                  label: d.hostname,
                  description: d.readiness === 'active' ? 'Custom domain' : 'Finish DNS setup to use this domain',
                  ...(d.readiness !== 'active' ? { disabled: true } : {}),
                })),
              ]}
            />
          )}
          <TextInput label="Back-half" placeholder="auto-generated" value={slug} onChange={setSlug} width="100%" isOptional />
          <TextInput label="Tags" placeholder="launch, docs" value={tags} onChange={setTags} width="100%" isOptional />

          <Button type="submit" variant="primary" size="lg" label="Create short link" width="100%" isLoading={busy} />
        </VStack>
      </form>

      {error && <Banner status="error" title={error} />}
      {created && <Banner status="success" title={copied === created ? 'Created and copied' : 'Created'} description={created} />}
    </Panel>
  )
}

/** Edge-to-edge rows: the whole row opens the link in the app, and a copy button fades in on hover. */
function RecentLinks({
  links,
  shortUrlFor,
  linkPage,
  copied,
  onCopy,
}: {
  links: RecentLink[]
  shortUrlFor: (slug: string, domainId: string | null) => string
  linkPage: (id: string) => string
  copied: string | null
  onCopy: (url: string) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <VStack gap={1} hAlign="stretch" width="100%" paddingBlockEnd={2}>
      <Text type="label" color="secondary" style={{ paddingInline: 'var(--spacing-4)' }}>
        Recent links
      </Text>
      <List density="compact">
        {links.map((link) => {
          const url = shortUrlFor(link.slug, link.domainId)
          const short = url.replace(/^https?:\/\//, '')
          const isCopied = copied === url
          const visible = hovered === link.id || isCopied
          return (
            <ListItem
              key={link.id}
              href={linkPage(link.id)}
              target="_blank"
              // The title says what it is; the short link is what gets shared.
              label={link.title?.trim() || short}
              description={link.title?.trim() ? short : hostOf(link.destinationUrl)}
              onMouseEnter={() => setHovered(link.id)}
              onMouseLeave={() => setHovered((current) => (current === link.id ? null : current))}
              onFocus={() => setHovered(link.id)}
              style={{ borderRadius: 0, paddingInline: 'var(--spacing-4)', transition: 'background-color 150ms ease' }}
              endContent={
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<Icon icon={isCopied ? CheckIcon : CopyIcon} />}
                  label={isCopied ? 'Copied' : 'Copy short link'}
                  tooltip={isCopied ? 'Copied' : 'Copy'}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onCopy(url)
                  }}
                  style={{ opacity: visible ? 1 : 0, transition: 'opacity 150ms ease' }}
                />
              }
            />
          )
        })}
      </List>
    </VStack>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
