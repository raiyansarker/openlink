import type { CSSProperties, ReactNode } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { CircleCheckSolidIcon } from '#/components/icons/IcnMcp'
import { DASHBOARD_SHELL_ACCENT } from '#/components/dashboard/layout/dashboard-shell-accent'

/*
 * The card is drawn once on a 260×128 viewBox and scales to whatever width
 * the layout gives it — SVG keeps the art exact at every size, so nothing
 * measures, rounds or letterboxes. The numbers below are the original design
 * grid, before the old 0.72 shrink: the SVG *is* the scaling.
 */

const SCALE = 0.72

/** Intrinsic card width (the desktop row layout); the viewBox stays fixed. */
const OUTER_W = Math.round(260 * SCALE)

const VB_W = 260
const VB_H = 128
/** Panel geometry in viewBox units. Bottom corners sit past vB_H so the
 *  frame's crop (overflow: hidden) squashes them flat, as before. */
const PANEL = { x: 40, y: 38, w: 220, h: 90 + 12, r: 12 }
/** The "Aa" type specimen inside a panel: pad from the panel's top-left. */
const AA = { x: 54, y: 78, size: 32 }
const LABEL_SIZE = Math.round(18 * SCALE)
const LABEL_GAP = Math.round(12 * SCALE)
const RADIUS_OUTER = Math.round(14 * SCALE)

const LIGHT_OUTER = '#f0f0f0'
const LIGHT_PANEL = '#ffffff'
const LIGHT_TEXT = '#333333'
const DARK_OUTER = '#141414'
const DARK_PANEL = '#3d3d3d'
const DARK_TEXT = '#f5f5f5'
const DARK_PANEL_EDGE = 'rgba(255, 255, 255, 0.1)'
const SYSTEM_DIVIDER = 'rgba(0, 0, 0, 0.2)'

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
   * theme previews read as three full-width rows instead of a narrow
   * column stuck to the left. The artwork scales fluidly; the label and
   * checkmark stay at comfortable reading sizes.
   */
  fill?: boolean
}

type HalfTheme = 'light' | 'dark'

/**
 * One half of the preview (a theme's outer + raised panel + "Aa").
 * Everything is in viewBox units; `x` is where this half starts.
 */
function Half({ theme, x, w }: { theme: HalfTheme; x: number; w: number }) {
  const isLight = theme === 'light'
  const outerBg = isLight ? LIGHT_OUTER : DARK_OUTER
  const panelBg = isLight ? LIGHT_PANEL : DARK_PANEL
  const textColor = isLight ? LIGHT_TEXT : DARK_TEXT
  const panelX = x + PANEL.x
  const panelW = Math.max(0, w - PANEL.x - 1) // −1: never touch the next half

  return (
    <g>
      <rect x={x} y={0} width={w} height={VB_H} fill={outerBg} />
      <rect
        x={panelX}
        y={PANEL.y}
        width={panelW}
        height={PANEL.h}
        rx={PANEL.r}
        fill={panelBg}
        stroke={isLight ? undefined : DARK_PANEL_EDGE}
        strokeWidth={1}
      />
      <text
        x={panelX + AA.x - PANEL.x}
        y={AA.y}
        fontSize={AA.size}
        fill={textColor}
        fontFamily={FONT}
      >
        Aa
      </text>
    </g>
  )
}

/** The 260×128 drawing: a solid theme, or light|dark halves for "system". */
function PreviewArt({ mode }: { mode: ThemePreviewMode }) {
  if (mode === 'light') return <Half theme="light" x={0} w={VB_W} />
  if (mode === 'dark') return <Half theme="dark" x={0} w={VB_W} />
  return (
    <g>
      <Half theme="light" x={0} w={VB_W / 2} />
      <rect x={VB_W / 2 - 0.5} y={0} width={1} height={VB_H} fill={SYSTEM_DIVIDER} />
      <Half theme="dark" x={VB_W / 2} w={VB_W / 2} />
    </g>
  )
}

/** Rounded crop around the art; the selection checkmark rides on top of it. */
function PreviewFrame({
  width,
  showTick,
  children,
}: {
  width: number | '100%'
  showTick: boolean
  children: ReactNode
}) {
  const frameStyle: CSSProperties = {
    position: 'relative',
    width,
    borderRadius: RADIUS_OUTER,
    overflow: 'hidden',
    flexShrink: 0,
  }
  return (
    <VStack gap={0} className="ol-theme-card__frame" style={frameStyle}>
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
  const artWidth = fill ? '100%' : OUTER_W
  return (
    <button
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
        width: fill ? '100%' : undefined,
      }}
    >
      <VStack gap={0} hAlign="center" vAlign="start">
        <PreviewFrame width={artWidth} showTick={isSelected}>
          <svg
            width={artWidth}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            aria-hidden
            style={{ display: 'block' }}
          >
            <PreviewArt mode={mode} />
          </svg>
        </PreviewFrame>
        <span
          style={{
            display: 'block',
            width: artWidth,
            marginTop: LABEL_GAP,
            fontSize: LABEL_SIZE,
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
