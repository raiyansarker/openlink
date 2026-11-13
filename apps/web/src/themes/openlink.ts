import { defineTheme } from '@astryxdesign/core/theme'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'

const OPENLINK_BRAND = '#FF4602'
const OPENLINK_BRAND_DARK = '#FF6B33'

/**
 * Shell backgrounds — light matches the original #f7f7f7 chrome; dark uses a
 * deeper canvas with a clearly lifted content panel (nav sits on the canvas).
 */
const OPENLINK_BG_BODY = ['#f7f7f7', '#0c0c0e'] as const
const OPENLINK_BG_SURFACE = ['#ffffff', '#18181b'] as const
const OPENLINK_BG_MUTED = ['#ececec', '#121214'] as const
const OPENLINK_BG_POPOVER = ['#ffffff', '#1f1f24'] as const

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
    '--color-background-body': [...OPENLINK_BG_BODY],
    '--color-background-surface': [...OPENLINK_BG_SURFACE],
    '--color-background-muted': [...OPENLINK_BG_MUTED],
    '--color-background-card': [...OPENLINK_BG_SURFACE],
    '--color-background-popover': [...OPENLINK_BG_POPOVER],
    '--color-background-gray': ['#ececec', '#232327'],
    '--color-border': ['rgba(0, 0, 0, 0.075)', 'rgba(255, 255, 255, 0.1)'],
    '--color-border-emphasized': ['#dfdfdf', '#3f3f46'],
    '--color-overlay-hover': ['rgba(0, 0, 0, 0.05)', 'rgba(255, 255, 255, 0.06)'],
    '--color-overlay-pressed': ['rgba(0, 0, 0, 0.08)', 'rgba(255, 255, 255, 0.09)'],
    /** Tuned for #f7f7f7 / #0c0c0e–#18181b shell — darker grays failed WCAG on small type. */
    '--color-text-primary': ['#0a0a0a', '#f4f4f5'],
    '--color-text-secondary': ['#4b4b50', '#c9c9ce'],
    '--color-text-disabled': ['#76767c', '#a3a3a8'],
    '--color-icon-secondary': ['#5a5a5f', '#c9c9ce'],
  },
  components: {
    'text-input': {
      base: {
        ...INPUT_QUIET_FOCUS,
        backgroundColor:
          'light-dark(var(--color-background-surface), var(--color-background-muted))',
      },
    },
    'text-area': {
      base: {
        ...INPUT_QUIET_FOCUS,
        backgroundColor:
          'light-dark(var(--color-background-surface), var(--color-background-muted))',
      },
    },
    'number-input': {
      base: {
        ...INPUT_QUIET_FOCUS,
        backgroundColor:
          'light-dark(var(--color-background-surface), var(--color-background-muted))',
      },
    },
    'field-label': {
      base: {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-semibold)',
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
      },
    },
    'field-description': {
      base: {
        fontSize: 'var(--font-size-sm)',
        fontWeight: 'var(--font-weight-regular)',
        lineHeight: 'var(--line-height-snug)',
        color: 'var(--color-text-secondary)',
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
        backgroundColor: 'light-dark(#f4f4f5, #232327)',
        color: 'light-dark(#18181b, #fafafa)',
        border: '1px solid light-dark(rgba(0,0,0,0.08), rgba(255,255,255,0.12))',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
      },
    },
  },
})
