import { memo, useDeferredValue, useMemo } from 'react'
import { useStore } from '@tanstack/react-form'
import {
  CreateLinkActions,
  Eyebrow,
  HeroDestination,
  HeroStatus,
  HeroTitle,
  LinkHero,
  RouteDiagram,
  ShortUrlHeadline,
  QrRow,
  SettingsList,
  type PreviewRule,
} from '#/components/create-link/LinkPreviewPanel'
import SocialPreviewCard from '#/components/create-link/SocialPreviewCard'
import { VStack } from '@astryxdesign/core/VStack'
import { useOrganization } from '#/contexts/OrganizationContext'
import { formatCompactNumber } from '#/lib/format/compact-number'
import {
  cleanUtm,
  initialStatus,
  normalizeUrl,
  type CreateLinkDraft,
} from '#/lib/links/create-link'
import type { LinkFolder } from '#/lib/api/types'
import { folderPathLabel } from '#/lib/links/folder-tree'
import { holdPageMeta } from '#/lib/links/hold-pages'
import {
  useDraftSelect,
  useDraftValue,
  useLinkForm,
  usePendingPreviewUrl,
  useShortHost,
  useShortUrl,
} from '#/components/create-link/form/LinkFormContext'
import {
  finalDestinationOf,
  formatLocal,
  hostOf,
  validDestination,
} from '#/components/create-link/form/derive'

function targetingSummaryOf(draft: CreateLinkDraft): string | null {
  if (!draft.targetingEnabled) return null
  const parts: string[] = []
  if (draft.iosUrl.trim()) parts.push('iOS')
  if (draft.androidUrl.trim()) parts.push('Android')
  const geo = draft.geoRules.filter((r) => r.country && r.url.trim()).length
  if (geo > 0) parts.push(`${geo} ${geo === 1 ? 'country' : 'countries'}`)
  return parts.length > 0 ? parts.join(', ') : null
}

function titleOf(draft: CreateLinkDraft): string {
  return (
    draft.title.trim() || hostOf(normalizeUrl(draft.destination)) || 'Untitled link'
  )
}

function statusLineOf(draft: CreateLinkDraft): string {
  if (draft.holdEnabled) {
    return `On hold — visitors see “${holdPageMeta(draft.holdPage).heading}”${
      draft.holdReleaseEnabled && draft.holdReleaseAt
        ? ` until ${formatLocal(draft.holdReleaseAt)}`
        : ' until you release it'
    }.`
  }
  return initialStatus(draft) === 'scheduled'
    ? `Scheduled — starts redirecting ${formatLocal(draft.activateAt)}.`
    : 'Goes live as soon as you create it.'
}

function originOf(url: string): string {
  try {
    return new URL(url).origin
  } catch {
    return ''
  }
}

function rulesOf(draft: CreateLinkDraft, folders: LinkFolder[]): PreviewRule[] {
  const utm = draft.utmEnabled ? cleanUtm(draft.utm) : undefined
  const targetingSummary = targetingSummaryOf(draft)
  const previewHasContent =
    draft.previewEnabled &&
    !!(
      draft.previewTitle.trim() ||
      draft.previewDescription.trim() ||
      draft.previewImage.trim()
    )

  return [
    { label: 'Folder', value: folderPathLabel(folders, draft.folderId) },
    draft.cloakEnabled
      ? { label: 'Delivery', value: 'Cloaked — URL stays short' }
      : {
          label: 'Redirect',
          value: `${draft.redirectStatus} ${draft.redirectStatus === 301 || draft.redirectStatus === 308 ? 'permanent' : 'temporary'}`,
        },
    ...(draft.holdEnabled
      ? [
          {
            label: 'Hold mode',
            value:
              holdPageMeta(draft.holdPage).label +
              (draft.holdReleaseEnabled && draft.holdReleaseAt
                ? ` until ${formatLocal(draft.holdReleaseAt)}`
                : ''),
          },
        ]
      : []),
    ...(targetingSummary ? [{ label: 'Targeting', value: targetingSummary }] : []),
    ...(draft.scheduleEnabled && draft.activateAt
      ? [{ label: 'Starts', value: formatLocal(draft.activateAt) }]
      : []),
    ...(draft.expiryEnabled && draft.expiresAt
      ? [{ label: 'Expires', value: formatLocal(draft.expiresAt) }]
      : []),
    ...(draft.clickLimitEnabled && draft.maxClicks
      ? [
          {
            label: 'Click limit',
            value: `${formatCompactNumber(draft.maxClicks)} clicks`,
          },
        ]
      : []),
    ...((draft.expiryEnabled || draft.clickLimitEnabled) &&
    draft.expiredDestination.trim()
      ? [
          {
            label: 'After expiry',
            value: hostOf(normalizeUrl(draft.expiredDestination)) || '—',
          },
        ]
      : []),
    ...(draft.passwordEnabled
      ? [{ label: 'Password', value: 'Required to open' }]
      : []),
    ...(draft.fallbackDestination.trim()
      ? [
          {
            label: 'Fallback',
            value: hostOf(normalizeUrl(draft.fallbackDestination)) || '—',
          },
        ]
      : []),
    ...(utm
      ? [{ label: 'UTM', value: `${Object.keys(utm).length} parameters` }]
      : []),
    ...(previewHasContent ? [{ label: 'Social preview', value: 'Custom' }] : []),
    ...(draft.metadata.some((r) => r.key.trim())
      ? [
          {
            label: 'Metadata',
            value: `${draft.metadata.filter((r) => r.key.trim()).length} fields`,
          },
        ]
      : []),
  ]
}

/*
 * The preview is split into independent blocks. Each reads only the draft
 * fields it shows and is memoized, so a keystroke redraws just the block(s)
 * that display that value; the rest of the panel (QR code, route drawing,
 * settings list) is left untouched.
 */

/*
 * The hero is one subscriber per line: typing a title redraws the title line,
 * typing a path redraws the destination line, and the short URL, route
 * drawing and status line stay put.
 */
const HeroHeadline = memo(function HeroHeadline() {
  return <ShortUrlHeadline shortUrl={useShortUrl()} />
})

const HeroRoute = memo(function HeroRoute() {
  // The site, not the full URL: typing a path doesn't redraw the drawing or reload the icon.
  const iconUrl = useDraftSelect((d) => originOf(validDestination(d)))
  return <RouteDiagram destination={iconUrl} />
})

const HeroTitleLine = memo(function HeroTitleLine() {
  return <HeroTitle title={useDraftSelect(titleOf)} />
})

const HeroDestinationLine = memo(function HeroDestinationLine() {
  return <HeroDestination destination={useDraftSelect(finalDestinationOf)} />
})

const HeroStatusLine = memo(function HeroStatusLine() {
  return <HeroStatus statusLine={useDraftSelect(statusLineOf)} />
})

const HeroBlock = memo(function HeroBlock() {
  return (
    <LinkHero
      headline={<HeroHeadline />}
      route={<HeroRoute />}
      title={<HeroTitleLine />}
      destination={<HeroDestinationLine />}
      status={<HeroStatusLine />}
    />
  )
})

const QrBlock = memo(function QrBlock() {
  const shortUrl = useShortUrl()
  const shortHost = useShortHost()
  const slug = useDraftValue('slug')
  // The code is expensive to redraw; let typing win and the code catch up.
  const deferredUrl = useDeferredValue(shortUrl)
  const fileName = `${shortHost}-${slug.trim() || 'link'}`.replace(/[^A-Za-z0-9._-]/g, '-')
  return <QrRow value={deferredUrl} fileName={fileName} />
})

const SocialCard = memo(function SocialCard() {
  const shortHost = useShortHost()
  const title = useDraftSelect((d) => d.previewTitle.trim() || titleOf(d))
  const description = useDraftSelect((d) => d.previewDescription.trim())
  const savedUrl = useDraftValue('previewImage')
  const pendingUrl = usePendingPreviewUrl()
  const imageUrl = pendingUrl || savedUrl
  return (
    <SocialPreviewCard
      host={shortHost}
      title={title}
      description={description}
      imageUrl={imageUrl}
    />
  )
})

const SharedBlock = memo(function SharedBlock() {
  const enabled = useDraftValue('previewEnabled')
  if (!enabled) return null
  return (
    <VStack gap={4} hAlign="stretch" width="100%">
      <Eyebrow title="When shared" hint="X, Slack, LinkedIn, iMessage" />
      <SocialCard />
    </VStack>
  )
})

const SettingsBlock = memo(function SettingsBlock() {
  const { folders } = useOrganization()
  // A string, so the block re-renders only when what it lists actually changes.
  const key = useDraftSelect((d) => JSON.stringify({ rules: rulesOf(d, folders), tags: d.tags }))
  const { rules, tags } = useMemo(
    () => JSON.parse(key) as { rules: PreviewRule[]; tags: string[] },
    [key],
  )
  if (rules.length === 0 && tags.length === 0) return null
  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      <Eyebrow title="Settings" />
      <SettingsList rules={rules} tags={tags} isFlat />
    </VStack>
  )
})

/** The live preview. */
export const PreviewAside = memo(function PreviewAside() {
  return (
    <VStack gap={10} hAlign="stretch" width="100%">
      <VStack gap={4} hAlign="stretch" width="100%">
        <Eyebrow title="Preview" hint="Updates as you type" />
        <HeroBlock />
      </VStack>
      <VStack gap={4} hAlign="stretch" width="100%">
        <Eyebrow title="QR code" />
        <QrBlock />
      </VStack>
      <SharedBlock />
      <SettingsBlock />
    </VStack>
  )
})

/** Create/Save and Cancel; the only footer piece that needs `isSubmitting`. */
export const SubmitActions = memo(function SubmitActions({
  isEditing,
  onSubmit,
  onCancel,
}: {
  isEditing: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const { form } = useLinkForm()
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting)
  return (
    <CreateLinkActions
      submitLabel={isEditing ? 'Save changes' : 'Create link'}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      onCancel={onCancel}
    />
  )
})
