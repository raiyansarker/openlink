import { defineTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'

const OPENLINK_BRAND = '#FF4602'
const OPENLINK_BRAND_DARK = '#FF6B33'

const INPUT_FIELD_RADIUS = '5px'

/** Border-only focus — semantic accent (blue), no inset shadow rings on fields. */
const INPUT_QUIET_FOCUS = {
  borderRadius: INPUT_FIELD_RADIUS,
  boxShadow: 'none',
  ':hover': { boxShadow: 'none' },
  ':focus-within': {
    boxShadow: 'none',
    borderColor: 'var(--color-accent)',
  },
} as const

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
    '--shadow-inset-hover': 'none',
    '--shadow-inset-selected': 'none',
    '--focus-outline-color': OPENLINK_BRAND,
  },
  components: {
    'text-input': {
      base: INPUT_QUIET_FOCUS,
    },
    'text-area': {
      base: INPUT_QUIET_FOCUS,
    },
    'number-input': {
      base: INPUT_QUIET_FOCUS,
    },
    'field-label': {
      base: {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        color:
          'color-mix(in oklab, var(--color-text-secondary) 72%, var(--color-background-surface))',
        cursor: 'pointer',
      },
    },
    'field-description': {
      base: {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-regular)',
        lineHeight: 'var(--line-height-snug)',
      },
    },
    section: {
      'variant:muted': {
        backgroundColor: 'var(--color-background-body)',
      },
      'variant:section': {
        backgroundColor: 'var(--color-background-surface)',
      },
    },
    tooltip: {
      base: {
        backgroundColor: 'light-dark(#f4f4f5, #27272a)',
        color: 'light-dark(#18181b, #fafafa)',
        border: '1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.12))',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
      },
    },
  },
})
