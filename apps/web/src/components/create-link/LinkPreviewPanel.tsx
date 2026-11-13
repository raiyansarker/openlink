import { useEffect, useId, useState, type ReactNode } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { useClipboard } from '@astryxdesign/core/hooks'
import Favicon from '#/components/create-link/Favicon'
import QrCode, {
  downloadQrPng,
  downloadQrSvg,
} from '#/components/create-link/QrCode'

export type PreviewRule = { label: string; value: string }

type LinkPreviewPanelProps = {
  shortUrl: string
  /** Final destination, UTM applied. Empty while the URL is missing/invalid. */
  destination: string
  title: string
  statusLine: string
  rules: PreviewRule[]
  tags: string[]
  /** Social card, when the custom preview is on. */
  socialCard?: ReactNode
  /** File name (no extension) for QR downloads. */
  qrFileName: string
}

export function RuleList({ rules, tags }: { rules: PreviewRule[]; tags: string[] }) {
  return (
    <VStack gap={2} hAlign="stretch" width="100%">
      {rules.map((rule) => (
        <HStack key={rule.label} gap={3} hAlign="between" vAlign="start" width="100%">
          <Text type="supporting" color="secondary">
            {rule.label}
          </Text>
          <Text
            type="supporting"
            weight="medium"
            maxLines={2}
            style={{ textAlign: 'end', wordBreak: 'break-word' }}
          >
            {rule.value}
          </Text>
        </HStack>
      ))}
      {tags.length > 0 ? (
        <HStack gap={3} hAlign="between" vAlign="start" width="100%">
          <Text type="supporting" color="secondary">
            Tags
          </Text>
          <Text type="supporting" weight="medium" style={{ textAlign: 'end' }}>
            {tags.map((t) => `#${t}`).join('  ')}
          </Text>
        </HStack>
      ) : null}
    </VStack>
  )
}

/** Title, the short URL (big, copyable) and where it goes. */
export function ShortLinkSummary({
  title,
  shortUrl,
  destination,
}: {
  title: string
  shortUrl: string
  destination: string
}) {
  const { copy, isCopied } = useClipboard()
  return (
    <VStack gap={2} hAlign="stretch" width="100%">
      <Text type="supporting" color="secondary" maxLines={1}>
        {title}
      </Text>
      <HStack gap={2} vAlign="center" hAlign="between" width="100%">
        <Text
          weight="semibold"
          maxLines={1}
          style={{ fontSize: 18, letterSpacing: '-0.01em', minWidth: 0 }}
        >
          {shortUrl.replace(/^https?:\/\//, '')}
        </Text>
        <Button
          variant="secondary"
          size="sm"
          label={isCopied ? 'Copied' : 'Copy'}
          onClick={() => void copy(shortUrl)}
        />
      </HStack>
      <HStack gap={2} vAlign="center" width="100%">
        <Favicon url={destination} size={14} />
        <Text type="supporting" color="secondary" maxLines={1} style={{ minWidth: 0 }}>
          {destination ? destination.replace(/^https?:\/\//, '') : 'Add a destination URL'}
        </Text>
      </HStack>
    </VStack>
  )
}

export function QrBlock({
  value,
  fileName,
  size = 168,
}: {
  value: string
  fileName: string
  size?: number
}) {
  return (
    <VStack gap={3} hAlign="center" width="100%">
      <span
        style={{
          display: 'inline-flex',
          padding: 10,
          borderRadius: 16,
          background: '#fff',
          boxShadow:
            '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
          border: '1px solid var(--color-border)',
        }}
      >
        <QrCode value={value} size={size} label={`QR code for ${value}`} />
      </span>
      <HStack gap={2} hAlign="center">
        <Button
          variant="ghost"
          size="sm"
          label="Download PNG"
          onClick={() => downloadQrPng(value, fileName)}
        />
        <Button
          variant="ghost"
          size="sm"
          label="SVG"
          tooltip="Download SVG"
          onClick={() => downloadQrSvg(value, fileName)}
        />
      </HStack>
    </VStack>
  )
}

type CreateLinkActionsProps = {
  /** Defaults to "Create link". */
  submitLabel?: string
  onSubmit: () => void
  onCancel: () => void
}

/**
 * ⌘↵ / Ctrl↵ keycap that sits inside a button. Tinted from the button's own
 * text color, so it reads on the dark (light mode) and light (dark mode)
 * primary button alike. The platform is detected after mount to keep SSR
 * and hydration identical.
 */
export function InlineShortcut() {
  const [isApple, setIsApple] = useState(true)
  useEffect(() => {
    setIsApple(/Mac|iPhone|iPad/.test(navigator.platform))
  }, [])
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '1px 6px',
        borderRadius: 5,
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: '0.02em',
        background: 'color-mix(in oklab, currentColor 16%, transparent)',
        color: 'color-mix(in oklab, currentColor 80%, transparent)',
      }}
    >
      {isApple ? '⌘' : 'Ctrl'}
      <span>↵</span>
    </span>
  )
}

/** Primary actions, pinned under the preview. */
export function CreateLinkActions({
  submitLabel = 'Create link',
  onSubmit,
  onCancel,
}: CreateLinkActionsProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 8,
        width: '100%',
      }}
    >
      <Button variant="ghost" label="Cancel" onClick={onCancel} />
      <Button
        variant="primary"
        label={submitLabel}
        width="100%"
        aria-keyshortcuts="Meta+Enter Control+Enter"
        endContent={<InlineShortcut />}
        onClick={onSubmit}
      />
    </div>
  )
}

export const PANEL_CARD_STYLE = {
  borderRadius: 16,
  border: '1px solid var(--color-border-emphasized)',
  background: 'var(--color-background-surface)',
} as const

/** Block heading inside the preview panel. */
export function BlockTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <HStack gap={3} hAlign="between" vAlign="center" width="100%">
      <Text weight="semibold">{title}</Text>
      {hint ? (
        <Text type="supporting" color="secondary">
          {hint}
        </Text>
      ) : null}
    </HStack>
  )
}

/** Favicon in a soft rounded tile, like an app icon. */
export function SiteTile({ url }: { url: string }) {
  return (
    <span
      style={{
        width: 44,
        height: 44,
        flexShrink: 0,
        borderRadius: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background-muted)',
        border: '1px solid var(--color-border)',
      }}
    >
      <Favicon url={url} size={22} />
    </span>
  )
}

/** Small uppercase label that opens a section; spacing, not rules, separates them. */
function Eyebrow({ title, hint }: { title: string; hint?: string }) {
  return (
    <HStack gap={3} hAlign="between" vAlign="center" width="100%">
      <Text
        type="supporting"
        weight="semibold"
        color="secondary"
        style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 11 }}
      >
        {title}
      </Text>
      {hint ? (
        <Text type="supporting" color="secondary">
          {hint}
        </Text>
      ) : null}
    </HStack>
  )
}

const LASSO_ROPE =
  'M42 48 C 58 48, 64 34, 86 36 C 112 40, 126 56, 114 70 C 102 84, 82 66, 94 50 C 106 34, 140 14, 176 26 C 210 38, 204 70, 226 66 C 238 64, 240 50, 246 48'
const LASSO_RING = 'M246 48 A32 32 0 0 1 310 48 A32 32 0 0 1 246 48'

/** Where every click starts: the browser (Chrome glyph), in the same tile as the destination's icon. */
function BrowserTile() {
  return (
    <span
      style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background-muted)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Chrome, monochrome: outer ring, inner circle, three tangent segments. */}
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth={1.5} />
        <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth={1.5} />
        {[0, 120, 240].map((deg) => (
          <path
            key={deg}
            d="M12 8.4H20.5"
            transform={`rotate(${deg} 12 12)`}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </span>
  )
}

/**
 * The redirect, drawn as a lasso: a trail of dots leaves the browser, wanders and
 * loops through the space between, then closes in a ring around the
 * destination's icon. It redraws itself on a slow loop.
 */
function RouteDiagram({ destination }: { destination: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <div className="ol-lasso" aria-hidden="true">
      <svg viewBox="0 0 320 96" className="ol-lasso-svg" fill="none">
        <defs>
          <mask id={`${id}-rope`} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="96">
            <path
              className="ol-lasso-draw ol-lasso-draw-rope"
              d={LASSO_ROPE}
              pathLength={1}
              stroke="#fff"
              strokeWidth={10}
              strokeLinecap="round"
            />
          </mask>
          <mask id={`${id}-ring`} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="96">
            <path
              className="ol-lasso-draw ol-lasso-draw-ring"
              d={LASSO_RING}
              pathLength={1}
              stroke="#fff"
              strokeWidth={10}
              strokeLinecap="round"
            />
          </mask>
        </defs>
        {/* Fine trail of dots: zero-length dashes with round caps. */}
        <g className="ol-lasso-fade" stroke="var(--color-text-primary)" strokeLinecap="round">
          <path
            d={LASSO_ROPE}
            mask={`url(#${id}-rope)`}
            strokeWidth={1.8}
            strokeDasharray="0 6"
          />
          <path
            d={LASSO_RING}
            mask={`url(#${id}-ring)`}
            strokeWidth={1.8}
            strokeDasharray="0 5"
          />
        </g>
      </svg>
      <div className="ol-lasso-mark">
        <BrowserTile />
      </div>
      <div className="ol-lasso-tile">
        <SiteTile url={destination} />
      </div>
    </div>
  )
}

/** The link itself, laid straight onto the panel: type, a route, and space. */
function LinkHero({
  title,
  shortUrl,
  destination,
  statusLine,
}: {
  title: string
  shortUrl: string
  destination: string
  statusLine: string
}) {
  const { copy, isCopied } = useClipboard()
  return (
    <VStack gap={5} hAlign="stretch" width="100%">
      <HStack gap={3} vAlign="center" hAlign="between" width="100%">
        <Text
          weight="semibold"
          maxLines={1}
          style={{ fontSize: 28, letterSpacing: '-0.03em', minWidth: 0 }}
        >
          {shortUrl.replace(/^https?:\/\//, '')}
        </Text>
        <Button
          variant="primary"
          size="sm"
          label={isCopied ? 'Copied' : 'Copy'}
          onClick={() => void copy(shortUrl)}
        />
      </HStack>

      <RouteDiagram destination={destination} />

      <VStack gap={1} hAlign="stretch" width="100%">
        <Text weight="semibold" maxLines={1}>
          {title}
        </Text>
        <Text type="supporting" color="secondary" maxLines={1}>
          {destination ? destination.replace(/^https?:\/\//, '') : 'Add a destination URL'}
        </Text>
        <Text type="supporting" color="secondary" style={{ marginTop: 6 }}>
          {statusLine}
        </Text>
      </VStack>
    </VStack>
  )
}

/** QR code beside its explanation and downloads. */
export function QrRow({ value, fileName }: { value: string; fileName: string }) {
  return (
    <HStack gap={5} vAlign="center" width="100%" wrap="wrap">
      <span
        style={{
          display: 'inline-flex',
          flexShrink: 0,
          padding: 10,
          borderRadius: 14,
          background: '#fff',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05), 0 6px 18px rgba(0,0,0,0.05)',
        }}
      >
        <QrCode value={value} size={120} label={`QR code for ${value}`} />
      </span>
      <VStack gap={3} style={{ flex: '1 1 160px', minWidth: 0 }}>
        <VStack gap={1}>
          <Text weight="semibold">Scan to open</Text>
          <Text type="supporting" color="secondary">
            Points at the short link, so every scan is counted and follows your
            rules.
          </Text>
        </VStack>
        <HStack gap={2} wrap="wrap">
          <Button
            variant="secondary"
            size="sm"
            label="Download PNG"
            onClick={() => downloadQrPng(value, fileName)}
          />
          <Button
            variant="secondary"
            size="sm"
            label="SVG"
            tooltip="Download SVG"
            onClick={() => downloadQrSvg(value, fileName)}
          />
        </HStack>
      </VStack>
    </HStack>
  )
}

/** Settings as a divided label/value list; tags render as chips. */
export function SettingsList({
  rules,
  tags,
  isFlat = false,
}: {
  rules: PreviewRule[]
  tags: string[]
  /** Drop the surrounding card, for use directly on a panel. */
  isFlat?: boolean
}) {
  return (
    <VStack
      gap={0}
      hAlign="stretch"
      width="100%"
      style={isFlat ? undefined : { ...PANEL_CARD_STYLE, borderRadius: 20, padding: '4px 20px' }}
    >
      {rules.map((row, index) => (
        <HStack
          key={row.label}
          gap={3}
          hAlign="between"
          vAlign="start"
          width="100%"
          style={{
            padding: isFlat ? '6px 0' : '11px 0',
            borderTop: !isFlat && index > 0 ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <Text type="supporting" color="secondary" style={{ flexShrink: 0 }}>
            {row.label}
          </Text>
          <Text
            type="supporting"
            weight="medium"
            maxLines={2}
            style={{ textAlign: 'end', wordBreak: 'break-word' }}
          >
            {row.value}
          </Text>
        </HStack>
      ))}
      {tags.length > 0 ? (
        <HStack
          gap={3}
          hAlign="between"
          vAlign="start"
          width="100%"
          style={{
            padding: isFlat ? '6px 0' : '11px 0',
            borderTop: !isFlat && rules.length > 0 ? '1px solid var(--color-border)' : 'none',
          }}
        >
          <Text type="supporting" color="secondary" style={{ flexShrink: 0 }}>
            Tags
          </Text>
          <HStack gap={1} hAlign="end" wrap="wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 500,
                  background: 'var(--color-background-muted)',
                  color: 'var(--color-text-primary)',
                }}
              >
                #{tag}
              </span>
            ))}
          </HStack>
        </HStack>
      ) : null}
    </VStack>
  )
}

/** Live preview: the link, its QR code, the share card and its settings. */
export default function LinkPreviewPanel({
  shortUrl,
  destination,
  title,
  statusLine,
  rules,
  tags,
  socialCard,
  qrFileName,
}: LinkPreviewPanelProps) {
  return (
    <VStack gap={10} hAlign="stretch" width="100%">
      <VStack gap={4} hAlign="stretch" width="100%">
        <Eyebrow title="Preview" hint="Updates as you type" />
        <LinkHero
          title={title}
          shortUrl={shortUrl}
          destination={destination}
          statusLine={statusLine}
        />
      </VStack>

      <VStack gap={4} hAlign="stretch" width="100%">
        <Eyebrow title="QR code" />
        <QrRow value={shortUrl} fileName={qrFileName} />
      </VStack>

      {socialCard ? (
        <VStack gap={4} hAlign="stretch" width="100%">
          <Eyebrow title="When shared" hint="X, Slack, LinkedIn, iMessage" />
          {socialCard}
        </VStack>
      ) : null}

      {rules.length > 0 || tags.length > 0 ? (
        <VStack gap={3} hAlign="stretch" width="100%">
          <Eyebrow title="Settings" />
          <SettingsList rules={rules} tags={tags} isFlat />
        </VStack>
      ) : null}
    </VStack>
  )
}
