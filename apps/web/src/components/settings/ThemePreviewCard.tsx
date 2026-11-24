import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { CircleCheckSolidIcon } from '#/components/icons/IcnMcp'
import { DASHBOARD_SHELL_ACCENT } from '#/components/dashboard/layout/dashboard-shell-accent'

const SCALE = 0.72

const OUTER_W = Math.round(260 * SCALE)
const OUTER_H = Math.round(128 * SCALE)
const PANEL_H = Math.round(90 * SCALE)
const PANEL_LEFT = Math.round(40 * SCALE)
const RADIUS_OUTER = Math.round(14 * SCALE)
const RADIUS_PANEL = Math.round(12 * SCALE)
const AA_SIZE = Math.round(32 * SCALE)
const AA_PAD = Math.round(14 * SCALE)
const LABEL_SIZE = Math.round(18 * SCALE)
const LABEL_GAP = Math.round(12 * SCALE)
const DIVIDER_W = 1

const LIGHT_OUTER = '#f0f0f0'
const LIGHT_PANEL = '#ffffff'
const DARK_OUTER = '#141414'
const DARK_PANEL = '#3d3d3d'

const FONT =
  'Geist Variable, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif'

export type ThemePreviewMode = 'system' | 'light' | 'dark'

type ThemePreviewCardProps = {
  mode: ThemePreviewMode
  label: string
  isSelected: boolean
  onSelect: () => void
  /**
   * Fill the parent's width — the phone appearance page uses this so the
   * theme previews don't read as a narrow column with unused space beside
   * them. Every measured dimension below scales with the measured width,
   * so the art grows instead of letterboxing.
   */
  fill?: boolean
}

type HalfTheme = 'light' | 'dark'

function PreviewHalf({ theme, width, scale = 1 }: { theme: HalfTheme; width: number; scale?: number }) {
  const isLight = theme === 'light'
  const outerBg = isLight ? LIGHT_OUTER : DARK_OUTER
  const panelBg = isLight ? LIGHT_PANEL : DARK_PANEL
  const textColor = isLight ? '#333333' : '#f5f5f5'
  const panelLeft = Math.round(PANEL_LEFT * scale)
  const panelW = width - panelLeft

  const panelStyle: CSSProperties = {
    position: 'absolute',
    left: panelLeft,
    bottom: 0,
    width: panelW,
    height: Math.round(PANEL_H * scale),
    borderRadius: `${Math.round(RADIUS_PANEL * scale)}px ${Math.round(RADIUS_PANEL * scale)}px ${Math.round(RADIUS_PANEL * scale)}px 0`,
    backgroundColor: panelBg,
  }

  if (!isLight) {
    panelStyle.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)'
  }

  return (
    <VStack
      gap={0}
      style={{
        position: 'relative',
        width,
        height: Math.round(OUTER_H * scale),
        backgroundColor: outerBg,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <VStack gap={0} hAlign="start" vAlign="start" style={panelStyle}>
        <span
          aria-hidden
          style={{
            display: 'block',
            padding: `${Math.round(AA_PAD * scale)}px ${Math.round(AA_PAD * scale)}px 0`,
            fontSize: Math.round(AA_SIZE * scale),
            fontWeight: 400,
            lineHeight: 1.1,
            color: textColor,
            fontFamily: FONT,
          }}
        >
          Aa
        </span>
      </VStack>
    </VStack>
  )
}

function SinglePreview({ theme, width, scale = 1 }: { theme: HalfTheme; width: number; scale?: number }) {
  return (
    <VStack
      gap={0}
      style={{
        position: 'relative',
        width,
        height: Math.round(OUTER_H * scale),
        borderRadius: Math.round(RADIUS_OUTER * scale),
        backgroundColor: theme === 'light' ? LIGHT_OUTER : DARK_OUTER,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <PreviewHalf theme={theme} width={width} scale={scale} />
    </VStack>
  )
}

function SystemPreview({ width, scale = 1 }: { width: number; scale?: number }) {
  const halfW = Math.floor((width - DIVIDER_W) / 2)

  return (
    <HStack
      gap={0}
      style={{
        width,
        height: Math.round(OUTER_H * scale),
        borderRadius: Math.round(RADIUS_OUTER * scale),
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <PreviewHalf theme="light" width={halfW} scale={scale} />
      <span
        aria-hidden
        style={{
          width: DIVIDER_W,
          height: Math.round(OUTER_H * scale),
          flexShrink: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      />
      <PreviewHalf theme="dark" width={halfW} scale={scale} />
    </HStack>
  )
}

function PreviewArt({ mode, width, scale }: { mode: ThemePreviewMode; width: number; scale: number }) {
  if (mode === 'system') return <SystemPreview width={width} scale={scale} />
  return <SinglePreview theme={mode} width={width} scale={scale} />
}

function PreviewFrame({
  width,
  scale,
  children,
  showTick,
}: {
  width: number
  scale: number
  children: ReactNode
  showTick: boolean
}) {
  return (
    <VStack
      gap={0}
      className="ol-theme-card__frame"
      style={{
        position: 'relative',
        width,
        height: Math.round(OUTER_H * scale),
        borderRadius: Math.round(RADIUS_OUTER * scale),
        flexShrink: 0,
      }}
    >
      {children}
      {showTick ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            display: 'flex',
            color: DASHBOARD_SHELL_ACCENT,
            pointerEvents: 'none',
          }}
        >
          <CircleCheckSolidIcon size={20} />
        </span>
      ) : null}
    </VStack>
  )
}

export default function ThemePreviewCard({
  mode,
  label,
  isSelected,
  onSelect,
  fill = false,
}: ThemePreviewCardProps) {
  // The art's intrinsic width (used for SSR and the desktop row layout).
  const [width, setWidth] = useState(OUTER_W)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // `fill`: measure this button (it's width: 100% of the row) and rescale
  // every dimension of the preview art by width / OUTER_W.
  useEffect(() => {
    if (!fill) return
    const el = buttonRef.current
    if (!el) return
    const measure = () => {
      const measured = el.clientWidth
      if (measured > 0) setWidth(measured)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [fill])

  const scale = width / OUTER_W

  return (
    <button
      ref={buttonRef}
      className="ol-theme-card"
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={label}
      onClick={onSelect}
      style={{
        margin: 0,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'center',
        fontFamily: 'inherit',
        ...(fill ? { width: '100%' } : {}),
      }}
    >
      <VStack gap={0} hAlign="center" vAlign="start">
        <PreviewFrame width={width} scale={scale} showTick={isSelected}>
          <PreviewArt mode={mode} width={width} scale={scale} />
        </PreviewFrame>
        <span
          style={{
            display: 'block',
            width,
            marginTop: Math.round(LABEL_GAP * scale),
            fontSize: Math.round(LABEL_SIZE * scale),
            lineHeight: 1.25,
            fontWeight: isSelected ? 600 : 400,
            color: isSelected
              ? 'var(--color-text-primary)'
              : 'var(--color-text-secondary)',
            fontFamily: FONT,
            textAlign: 'center',
          }}
        >
          {label}
        </span>
      </VStack>
    </button>
  )
}
