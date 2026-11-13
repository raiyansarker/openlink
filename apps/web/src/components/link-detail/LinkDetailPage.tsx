import { useState, type ComponentProps } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { BottomSheet } from '@astryxdesign/core/BottomSheet'
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs'
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
import LinkComments from '#/components/link-detail/LinkComments'
import LinkHistoryTimeline from '#/components/link-detail/LinkHistoryTimeline'
import LinkSettingsPanel from '#/components/link-detail/LinkSettingsPanel'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import MoveToFolderDialog, { type MoveSubject } from '#/components/links/MoveToFolderDialog'
import { FolderIcon, MoreHorizontalIcon } from '#/components/icons/IcnMcp'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { ShortLink } from '#/data/demo/types'
import { shortHostFor, shortUrlFor } from '#/data/demo/short-url'
import { buildDashboardOrgPath } from '#/lib/dashboard/build-org-path'
import { formatNumber } from '#/lib/analytics/format'
import { isOnHold } from '#/lib/links/create-link'
import { getFolderPath } from '#/lib/links/folder-tree'
import { linkStatusLabel, linkStatusLine } from '#/lib/links/link-summary'

export const LINK_DETAIL_TABS = ['analytics', 'comments', 'settings', 'history'] as const
export type LinkDetailTab = (typeof LINK_DETAIL_TABS)[number]

type LinkDetailPageProps = {
  linkId: string
  tab: LinkDetailTab
  onTabChange: (tab: LinkDetailTab) => void
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

/** Monochrome status: a solid dot while serving, a ring otherwise. No color. */
function StatusMark({ link }: { link: ShortLink }) {
  const isServing = !isOnHold(link) && link.status === 'active'
  return (
    <HStack gap={1.5} vAlign="center">
      <span
        aria-hidden="true"
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          flexShrink: 0,
          boxSizing: 'border-box',
          background: isServing ? 'var(--color-text-primary)' : 'transparent',
          border: '1.5px solid var(--color-text-primary)',
        }}
      />
      <Text type="supporting" weight="medium">
        {linkStatusLabel(link)}
      </Text>
    </HStack>
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
          <StatusMark link={link} />
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
 * analytics (the Insights panels scoped to this link), settings, and history.
 */
export default function LinkDetailPage({ linkId, tab, onTabChange }: LinkDetailPageProps) {
  const navigate = useNavigate()
  const {
    activeOrg,
    links,
    folders,
    duplicateLink,
    moveLink,
    setLinkHold,
    deleteLink,
    checkLinksHealth,
    addLinkComment,
    editLinkComment,
    deleteLinkComment,
    toggleCommentReaction,
  } = useOrganization()
  const [moving, setMoving] = useState<MoveSubject | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isQrOpen, setIsQrOpen] = useState(false)

  const link = links.find((l) => l.id === linkId)
  const linksPath = buildDashboardOrgPath(activeOrg.slug, 'links')

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

  const shortUrl = shortUrlFor(link.slug, activeOrg, link.domainId)
  const host = shortHostFor(activeOrg, link.domainId)
  const path = getFolderPath(folders, link.folderId ?? null)
  const held = isOnHold(link)
  const historyCount = link.history?.length ?? 0
  const comments = link.comments ?? []
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
      onClick: () => setLinkHold(link.id, held ? null : { page: link.hold?.page ?? 'bad-gateway' }),
    },
    { type: 'divider' as const },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onClick: () => openEdit(duplicateLink(link.id).id),
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
            value="comments"
            label="Comments"
            id={tabId('comments')}
            panelId={panelId('comments')}
            endContent={<TabCount count={comments.length} />}
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
          {tab === 'analytics' ? <LinkAnalyticsSection linkId={link.id} /> : null}

          {tab === 'comments' ? (
            <LinkComments
              comments={comments}
              onAdd={(body) => addLinkComment(link.id, body)}
              onEdit={(commentId, body) => editLinkComment(link.id, commentId, body)}
              onDelete={(commentId) => deleteLinkComment(link.id, commentId)}
              onToggleReaction={(commentId, emoji) =>
                toggleCommentReaction(link.id, commentId, emoji)
              }
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

          {tab === 'history' ? <LinkHistoryTimeline events={link.history ?? []} /> : null}
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
          if (subject.kind === 'link') moveLink(subject.id, destinationId)
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
          deleteLink(link.id)
          setIsDeleteOpen(false)
          goToFolder(folderId)
        }}
      />
    </VStack>
  )
}
