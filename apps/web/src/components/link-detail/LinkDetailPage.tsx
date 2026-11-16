import { useState, type ComponentProps } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'

import { DropdownMenu } from '@astryxdesign/core/DropdownMenu'
import { EmptyState } from '@astryxdesign/core/EmptyState'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { IconButton } from '@astryxdesign/core/IconButton'

import { Tab, TabList } from '@astryxdesign/core/TabList'
import { Text } from '@astryxdesign/core/Text'

import { VStack } from '@astryxdesign/core/VStack'
import { useClipboard } from '@astryxdesign/core/hooks'
import { QrBlock } from '#/components/create-link/LinkPreviewPanel'
import LinkAnalyticsSection from '#/components/analytics/LinkAnalyticsSection'
import LinkNotes, { lastNotesEdit } from '#/components/link-detail/LinkNotes'
import { useLinkHistory } from '#/hooks/use-link-history'
import { QueryKeys } from '#/lib/api/query'
import LinkHistoryTimeline, { type HistoryKind } from '#/components/link-detail/LinkHistoryTimeline'
import LinkSettingsPanel from '#/components/link-detail/LinkSettingsPanel'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import MoveToFolderDialog, { type MoveSubject } from '#/components/links/MoveToFolderDialog'
import { FolderIcon, MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { ShortLink } from '#/data/demo/types'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import { formatNumber } from '#/lib/analytics/format'
import type { AnalyticsView } from '#/lib/analytics/search'
import { isOnHold } from '#/lib/links/create-link'
import { getFolderPath } from '#/lib/links/folder-tree'
import { linkStatusLabel, linkStatusLine } from '#/lib/links/link-summary'

export const LINK_DETAIL_TABS = ['analytics', 'notes', 'settings', 'history'] as const
export type LinkDetailTab = (typeof LINK_DETAIL_TABS)[number]

type LinkDetailPageProps = {
  linkId: string
  tab: LinkDetailTab
  onTabChange: (tab: LinkDetailTab) => void
  analyticsView: AnalyticsView
  onAnalyticsViewChange: (change: Partial<AnalyticsView>) => void
  /** History tab filter; null is All. */
  historyKind: HistoryKind | null
  onHistoryKindChange: (kind: HistoryKind | null) => void
}

const stripScheme = (url: string) => url.replace(/^https?:\/\//, '')
const tabId = (tab: LinkDetailTab) => `link-tab-${tab}`
const panelId = (tab: LinkDetailTab) => `link-panel-${tab}`

/** Muted count after a tab label; nothing when zero. */
function TabCount({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <Text type="supporting" color="secondary">
      {count}
    </Text>
  )
}

/** Identity and the link's actions, above the tabs. */
function LinkHeader({
  link,
  shortUrl,
  onEdit,
  onShowQr,
  menuItems,
}: {
  link: ShortLink
  shortUrl: string
  onEdit: () => void
  onShowQr: () => void
  menuItems: NonNullable<ComponentProps<typeof DropdownMenu>['items']>
}) {
  const { copy, isCopied } = useClipboard()

  return (
    <HStack gap={4} hAlign="between" vAlign="start" width="100%" wrap="wrap">
      <VStack gap={2} style={{ minWidth: 0, flex: '1 1 24rem' }}>
        <Heading level={1}>{link.title}</Heading>
        <HStack gap={3} vAlign="center" wrap="wrap">
          <Text type="supporting" weight="medium">
            {linkStatusLabel(link)}
          </Text>
          <Text type="supporting" color="secondary">
            {link.clicks > 0 ? `${formatNumber(link.clicks)} lifetime clicks · ` : ''}
            {linkStatusLine(link)}
          </Text>
        </HStack>
      </VStack>

      <HStack gap={2} vAlign="center" wrap="wrap">
        <Button
          variant="secondary"
          label="Visit"
          href={shortUrl}
          target="_blank"
          rel="noopener noreferrer"
        />
        <Button variant="secondary" label="QR code" onClick={onShowQr} />
        <Button variant="secondary" label="Edit" onClick={onEdit} />
        <Button
          variant="primary"
          label={isCopied ? 'Copied' : 'Copy link'}
          onClick={() => void copy(shortUrl)}
        />
        <DropdownMenu
          hasChevron={false}
          presentation="popover"
          placement="below"
          alignment="end"
          menuWidth={210}
          renderTrigger={(triggerProps) => (
            <IconButton
              {...triggerProps}
              variant="secondary"
              label="More actions"
              tooltip="More actions"
              icon={<MoreHorizontalIcon size={16} />}
            />
          )}
          items={menuItems}
        />
      </HStack>
    </HStack>
  )
}

/** The link's QR code, large, with its downloads. */
function QrSheet({
  isOpen,
  onOpenChange,
  shortUrl,
  fileName,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  shortUrl: string
  fileName: string
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      label="Link QR code"
      purpose="info"
      height="hug"
      padding={6}
    >
      <VStack gap={5} hAlign="center" width="100%">
        <VStack gap={1} hAlign="center">
          <Heading level={2}>QR code</Heading>
          <Text color="secondary" style={{ textAlign: 'center', overflowWrap: 'anywhere' }}>
            {stripScheme(shortUrl)}
          </Text>
        </VStack>
        <QrBlock value={shortUrl} fileName={fileName} size={220} />
        <Text type="supporting" color="secondary" style={{ textAlign: 'center' }}>
          Share it in print or on screen. Scans follow your link settings and count as clicks.
        </Text>
        <Button variant="secondary" label="Done" onClick={() => onOpenChange(false)} />
      </VStack>
    </BottomSheet>
  )
}

/**
 * One short link: a header with its identity and actions, then tabs for its
 * analytics (the Insights panels scoped to this link), team notes, settings, and history.
 */
export default function LinkDetailPage({
  linkId,
  tab,
  onTabChange,
  analyticsView,
  onAnalyticsViewChange,
  historyKind,
  onHistoryKindChange,
}: LinkDetailPageProps) {
  const navigate = useNavigate()
  const {
    activeOrg,
    links,
    folders,
    duplicateLink,
    moveLink,
    setLinkHold,
    saveLinkNotes,
    deleteLink,
    checkLinksHealth,
    shortHostFor,
    shortUrlFor,
  } = useOrganization()
  const [moving, setMoving] = useState<MoveSubject | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  // The filter only applies on the History tab; elsewhere (tab count, Notes) the newest events of any kind.
  const history = useLinkHistory(activeOrg.id, linkId, tab === 'history' ? historyKind : null)
  const run = (action: () => Promise<unknown>) => {
    setActionError(null)
    action().catch((err: unknown) =>
      setActionError(err instanceof Error ? err.message : 'Something went wrong.'),
    )
  }

  const link = links.find((l) => l.id === linkId)
  const linksPath = WorkspaceUrl.build(activeOrg.slug, 'links')

  if (!link) {
    return (
      <EmptyState
        title="Link not found"
        description="It may have been deleted, or it belonged to an earlier session."
        icon={<EmptyLinksIllustration />}
        actions={
          <Button
            variant="secondary"
            label="Back to links"
            onClick={() => void navigate({ to: linksPath })}
          />
        }
      />
    )
  }

  const shortUrl = shortUrlFor(link.slug, link.domainId)
  const host = shortHostFor(link.domainId)
  const path = getFolderPath(folders, link.folderId ?? null)
  const held = isOnHold(link)
  const historyCount = history.summary?.total ?? 0
  const goToFolder = (folderId: string | null) =>
    void navigate({ to: linksPath, search: { folder: folderId ?? undefined } })
  const openEdit = (id = link.id) =>
    void navigate({
      to: '/edit/link',
      search: { org: activeOrg.slug, link: id },
    })

  const menuItems = [
    {
      id: 'open',
      label: 'Open destination',
      onClick: () => void window.open(link.targetUrl, '_blank', 'noopener,noreferrer'),
    },
    {
      id: 'hold',
      label: held ? 'Release hold' : 'Put on hold',
      onClick: () => run(() => setLinkHold(link.id, held ? null : { page: link.hold?.page ?? 'bad-gateway' })),
    },
    { type: 'divider' as const },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onClick: () => run(async () => openEdit((await duplicateLink(link.id)).id)),
    },
    {
      id: 'move',
      label: 'Move to…',
      onClick: () =>
        setMoving({
          kind: 'link',
          id: link.id,
          name: link.title,
          folderId: link.folderId ?? null,
        }),
    },
    { type: 'divider' as const },
    {
      id: 'delete',
      label: 'Delete link',
      variant: 'destructive' as const,
      onClick: () => setIsDeleteOpen(true),
    },
  ]

  return (
    <VStack gap={6} hAlign="stretch" width="100%">
      {actionError ? <Banner status="error" title={actionError} /> : null}
      <VStack gap={4} hAlign="stretch" width="100%">
        {/* Where this link lives */}
        <Breadcrumbs label="Link location">
          <BreadcrumbItem startIcon={<FolderIcon size={14} />} onClick={() => goToFolder(null)}>
            All links
          </BreadcrumbItem>
          {path.map((folder) => (
            <BreadcrumbItem key={folder.id} onClick={() => goToFolder(folder.id)}>
              {folder.name}
            </BreadcrumbItem>
          ))}
          <BreadcrumbItem isCurrent>{link.title}</BreadcrumbItem>
        </Breadcrumbs>

        <LinkHeader
          link={link}
          shortUrl={shortUrl}
          onEdit={() => openEdit()}
          onShowQr={() => setIsQrOpen(true)}
          menuItems={menuItems}
        />
      </VStack>

      <VStack gap={6} hAlign="stretch" width="100%">
        <TabList
          role="tablist"
          hasDivider
          value={tab}
          onChange={(value) => onTabChange(value as LinkDetailTab)}
        >
          <Tab
            value="analytics"
            label="Analytics"
            id={tabId('analytics')}
            panelId={panelId('analytics')}
          />
          <Tab
            value="notes"
            label="Notes"
            id={tabId('notes')}
            panelId={panelId('notes')}
          />
          <Tab
            value="settings"
            label="Settings"
            id={tabId('settings')}
            panelId={panelId('settings')}
          />
          <Tab
            value="history"
            label="History"
            id={tabId('history')}
            panelId={panelId('history')}
            endContent={<TabCount count={historyCount} />}
          />
        </TabList>

        <VStack
          id={panelId(tab)}
          role="tabpanel"
          aria-labelledby={tabId(tab)}
          gap={5}
          hAlign="stretch"
          width="100%"
          // Analytics gets extra air under the tabs so the dense panels don't
          // crowd the header.
          paddingBlockStart={tab === 'analytics' ? 6 : 2}
        >
          {tab === 'analytics' ? <LinkAnalyticsSection linkId={link.id} view={analyticsView} onViewChange={onAnalyticsViewChange} /> : null}

          {tab === 'notes' ? (
            <LinkNotes
              notes={link.description ?? ''}
              lastEdit={lastNotesEdit(history.events)}
              onSave={async (notes) => {
                await saveLinkNotes(link.id, notes)
                void queryClient.invalidateQueries({ queryKey: QueryKeys.linkHistory(activeOrg.id, link.id) })
              }}
            />
          ) : null}

          {tab === 'settings' ? (
            <LinkSettingsPanel
              link={link}
              shortUrl={shortUrl}
              host={host}
              folders={folders}
              onCheckHealth={() => checkLinksHealth([link.id])}
            />
          ) : null}

          {tab === 'history' ? (
            <LinkHistoryTimeline
              events={history.events}
              summary={history.summary}
              kind={historyKind}
              onKindChange={onHistoryKindChange}
              isLoading={history.isLoading}
              loadError={history.error}
              onRetry={history.retry}
              hasMore={history.hasMore}
              isLoadingMore={history.isLoadingMore}
              onLoadMore={history.loadMore}
            />
          ) : null}
        </VStack>
      </VStack>

      <QrSheet
        isOpen={isQrOpen}
        onOpenChange={setIsQrOpen}
        shortUrl={shortUrl}
        fileName={`${host}-${link.slug}`}
      />
      <MoveToFolderDialog
        subject={moving}
        folders={folders}
        onOpenChange={(open) => {
          if (!open) setMoving(null)
        }}
        onMove={(subject, destinationId) => {
          if (subject.kind === 'link') return moveLink(subject.id, destinationId)
        }}
      />
      <AlertDialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title={`Delete ${link.title}?`}
        description="The short URL and its QR code stop working immediately. This cannot be undone."
        actionLabel="Delete link"
        actionVariant="destructive"
        onAction={() => {
          const folderId = link.folderId ?? null
          setIsDeleteOpen(false)
          run(async () => {
            await deleteLink(link.id)
            goToFolder(folderId)
          })
        }}
      />
    </VStack>
  )
}
