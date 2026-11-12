import { defineTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'

const OPENLINK_BRAND = '#FF4602'
const OPENLINK_BRAND_DARK = '#FF6B33'

const GEIST_FALLBACKS =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const GEIST_MONO_FALLBACKS =
  'ui-monospace, "SF Mono", Monaco, Consolas, "Liberation Mono", monospace'

/**
 * OpenLink brand orange is a highlight color — not the semantic `--color-accent`
 * that powers primary buttons in the neutral theme.
 */
export const openlinkTheme = defineTheme({
  name: 'openlink-neutral',
  extends: neutralTheme,
  typography: {
    body: {
      family: 'Geist Variable',
      fallbacks: GEIST_FALLBACKS,
    },
    heading: {
      family: 'Geist Variable',
      fallbacks: GEIST_FALLBACKS,
      weights: { 3: 'bold', 4: 'bold' },
    },
    code: {
      family: 'Geist Mono Variable',
      fallbacks: GEIST_MONO_FALLBACKS,
    },
  },
  localTokens: {
    '--openlink-brand': [OPENLINK_BRAND, OPENLINK_BRAND_DARK],
    '--openlink-brand-muted': [
      'color-mix(in oklab, #FF4602 16%, transparent)',
      'color-mix(in oklab, #FF6B33 22%, transparent)',
    ],
  },
  tokens: {
    '--shadow-inset-selected': `inset 0 0 0 2px light-dark(${OPENLINK_BRAND}, ${OPENLINK_BRAND_DARK})`,
    '--focus-outline-color': OPENLINK_BRAND,
  },
  components: {
    section: {
      'variant:muted': {
        backgroundColor: 'var(--color-background-body)',
      },
      'variant:section': {
        backgroundColor: 'var(--color-background-surface)',
      },
    },
  },
})
