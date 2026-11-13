import type { ReactNode } from 'react'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { QrRow, SettingsList } from '#/components/create-link/LinkPreviewPanel'
import LinkHealthCard from '#/components/link-detail/LinkHealthCard'
import type { LinkFolder, ShortLink } from '#/data/demo/types'
import { formatDateTime, linkSettingsRows } from '#/lib/links/link-summary'

type LinkSettingsPanelProps = {
  link: ShortLink
  shortUrl: string
  host: string
  folders: LinkFolder[]
  onCheckHealth: () => Promise<void>
}

const stripScheme = (url: string) => url.replace(/^https?:\/\//, '')

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack gap={3} hAlign="between" vAlign="start" width="100%" style={{ padding: '6px 0' }}>
      <Text type="supporting" color="secondary" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text
        type="supporting"
        weight="medium"
        maxLines={3}
        style={{ textAlign: 'end', wordBreak: 'break-word' }}
      >
        {value}
      </Text>
    </HStack>
  )
}

/**
 * One block of the Settings tab, laid out like a settings page: title and
 * hint on the left, content on the right. Whitespace separates blocks — no
 * cards or rules — and the two columns stack when the panel is narrow.
 */
function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <HStack as="section" gap={8} vAlign="start" width="100%" wrap="wrap">
      <VStack gap={1} hAlign="start" style={{ flex: '0 1 240px', minWidth: 200 }}>
        <Text weight="semibold">{title}</Text>
        {description ? (
          <Text type="supporting" color="secondary">
            {description}
          </Text>
        ) : null}
      </VStack>
      <VStack gap={0} hAlign="stretch" style={{ flex: '1 1 380px', minWidth: 0 }}>
        {children}
      </VStack>
    </HStack>
  )
}

/** The link's settings, details, QR code and destination health. */
export default function LinkSettingsPanel({
  link,
  shortUrl,
  host,
  folders,
  onCheckHealth,
}: LinkSettingsPanelProps) {
  return (
    <VStack gap={10} hAlign="stretch" width="100%" style={{ maxWidth: 960 }}>
      <SettingsSection
        title="Settings"
        description="How the link behaves. Edit the link to change them."
      >
        <SettingsList rules={linkSettingsRows(link, folders)} tags={link.tags} isFlat />
      </SettingsSection>

      <SettingsSection title="Details" description="Fixed when the link was created.">
        <DetailRow label="Domain" value={host} />
        <DetailRow label="Back-half" value={`/${link.slug}`} />
        <DetailRow label="Destination" value={stripScheme(link.targetUrl)} />
        <DetailRow label="Created" value={formatDateTime(link.createdAt)} />
        <DetailRow label="Last updated" value={formatDateTime(link.updatedAt ?? link.createdAt)} />
        {link.description ? <DetailRow label="Notes" value={link.description} /> : null}
      </SettingsSection>

      <SettingsSection
        title="QR code"
        description="Print it or put it on packaging. Scans count as clicks."
      >
        <QrRow value={shortUrl} fileName={`${host}-${link.slug}`} />
      </SettingsSection>

      <SettingsSection
        title="Destination health"
        description="Whether the page this link points at still loads."
      >
        <LinkHealthCard health={link.health} onCheck={onCheckHealth} isFlat />
      </SettingsSection>
    </VStack>
  )
}
