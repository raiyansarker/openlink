import type { CSSProperties } from 'react'

/**
 * Astryx data-visualization tokens, in series order. TanStack Charts reads
 * `--ts-chart-1…6` for its default palette, so charts follow the app theme
 * (including dark mode) without rebuilding definitions.
 */
export const SERIES_COLORS = [
  'var(--color-data-categorical-blue)',
  'var(--color-data-categorical-purple)',
  'var(--color-data-categorical-teal)',
  'var(--color-data-categorical-orange)',
  'var(--color-data-categorical-pink)',
  'var(--color-data-categorical-green)',
] as const

export const NEUTRAL_SERIES = 'var(--color-data-neutral)'

/** Fixed per channel, so a channel keeps its color when rankings change. */
export const CHANNEL_COLORS: Record<string, string> = {
  direct: SERIES_COLORS[0],
  social: SERIES_COLORS[1],
  search: SERIES_COLORS[2],
  email: SERIES_COLORS[3],
  qr: SERIES_COLORS[4],
}

/**
 * Sequential ramp (quiet → strong) for heatmaps. Each step mixes the accent
 * into the card surface, so the scale reads correctly in light and dark mode
 * instead of using fixed light tints.
 */
export const BLUE_RAMP = [6, 18, 34, 52, 74, 100].map(
  (pct) =>
    `color-mix(in oklab, var(--color-data-categorical-blue) ${pct}%, var(--color-background-surface))`,
)

/** Applied to the element that wraps a chart. */
export const chartHostStyle = {
  color: 'var(--color-text-secondary)',
  '--ts-chart-1': SERIES_COLORS[0],
  '--ts-chart-2': SERIES_COLORS[1],
  '--ts-chart-3': SERIES_COLORS[2],
  '--ts-chart-4': SERIES_COLORS[3],
  '--ts-chart-5': SERIES_COLORS[4],
  '--ts-chart-6': SERIES_COLORS[5],
} as CSSProperties
