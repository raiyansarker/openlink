import type { CSSProperties, ReactNode } from 'react'
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
}

type HalfTheme = 'light' | 'dark'

function PreviewHalf({ theme, width }: { theme: HalfTheme; width: number }) {
  const isLight = theme === 'light'
  const outerBg = isLight ? LIGHT_OUTER : DARK_OUTER
  const panelBg = isLight ? LIGHT_PANEL : DARK_PANEL
  const textColor = isLight ? '#333333' : '#f5f5f5'
  const panelLeft = Math.round(PANEL_LEFT * (width / OUTER_W))
  const panelW = width - panelLeft

  const panelStyle: CSSProperties = {
    position: 'absolute',
    left: panelLeft,
    bottom: 0,
    width: panelW,
    height: PANEL_H,
    borderRadius: `${RADIUS_PANEL}px ${RADIUS_PANEL}px ${RADIUS_PANEL}px 0`,
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
        height: OUTER_H,
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
            padding: `${AA_PAD}px ${AA_PAD}px 0`,
            fontSize: AA_SIZE,
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

function SinglePreview({ theme }: { theme: HalfTheme }) {
  return (
    <VStack
      gap={0}
      style={{
        position: 'relative',
        width: OUTER_W,
        height: OUTER_H,
        borderRadius: RADIUS_OUTER,
        backgroundColor: theme === 'light' ? LIGHT_OUTER : DARK_OUTER,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <PreviewHalf theme={theme} width={OUTER_W} />
    </VStack>
  )
}

function SystemPreview() {
  const halfW = Math.floor((OUTER_W - DIVIDER_W) / 2)

  return (
    <HStack
      gap={0}
      style={{
        width: OUTER_W,
        height: OUTER_H,
        borderRadius: RADIUS_OUTER,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <PreviewHalf theme="light" width={halfW} />
      <span
        aria-hidden
        style={{
          width: DIVIDER_W,
          height: OUTER_H,
          flexShrink: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
        }}
      />
      <PreviewHalf theme="dark" width={halfW} />
    </HStack>
  )
}

function PreviewArt({ mode }: { mode: ThemePreviewMode }) {
  if (mode === 'system') return <SystemPreview />
  return <SinglePreview theme={mode} />
}

function PreviewFrame({
  children,
  showTick,
}: {
  children: ReactNode
  showTick: boolean
}) {
  return (
    <VStack
      gap={0}
      style={{
        position: 'relative',
        width: OUTER_W,
        height: OUTER_H,
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
}: ThemePreviewCardProps) {
  return (
    <button
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
      }}
    >
      <VStack gap={0} hAlign="center" vAlign="start">
        <PreviewFrame showTick={isSelected}>
          <PreviewArt mode={mode} />
        </PreviewFrame>
        <span
          style={{
            display: 'block',
            width: OUTER_W,
            marginTop: LABEL_GAP,
            fontSize: LABEL_SIZE,
            lineHeight: 1.25,
            fontWeight: isSelected ? 600 : 400,
            color: isSelected ? '#222222' : '#666666',
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
