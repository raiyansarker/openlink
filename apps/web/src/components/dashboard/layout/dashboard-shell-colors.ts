/** Dashboard / settings shell surfaces — follow Astryx neutral tokens in light and dark. */
export const DASHBOARD_SURFACE_BG = 'var(--color-background-body)'

/** Column 1 — org switcher rail (dark chrome in both modes; sits between canvas and panel in dark). */
export const DASHBOARD_RAIL_BG = 'light-dark(#161618, #101012)'
export const DASHBOARD_RAIL_HOVER_BG = 'rgba(255, 255, 255, 0.07)'
export const DASHBOARD_RAIL_SELECTED_BG = 'rgba(255, 255, 255, 0.08)'

export const DASHBOARD_CONTENT_PANEL_BG = 'var(--color-background-surface)'
export const DASHBOARD_CONTENT_PANEL_RADIUS = 9
export const DASHBOARD_CONTENT_PANEL_BORDER =
  '1px solid light-dark(var(--color-border), rgba(255, 255, 255, 0.11))'
export const DASHBOARD_CONTENT_PANEL_SHADOW = 'light-dark(none, 0 16px 48px rgba(0, 0, 0, 0.42))'

export const DASHBOARD_NAV_HOVER_BG = 'var(--color-overlay-hover)'
export const DASHBOARD_NAV_SELECTED_BG = 'var(--color-overlay-pressed)'

export const SHELL_NAV_TEXT_PRIMARY = 'var(--color-text-primary)'
export const SHELL_NAV_TEXT_SECONDARY = 'var(--color-text-secondary)'
/** Unselected nav icons — secondary keeps contrast in dark mode. */
export const SHELL_NAV_ICON_COLOR = 'var(--color-text-secondary)'
export const SHELL_NAV_GROUP_LABEL =
  'color-mix(in oklab, var(--color-text-primary) 38%, var(--color-text-secondary))'

export const SHELL_CHROME_BORDER = '1px solid var(--color-border-emphasized)'
export const SHELL_POPOVER_SURFACE = 'var(--color-background-popover)'

/** Shared top inset so org rail and nav column line up. */
export const DASHBOARD_CHROME_TOP_PADDING = 14

/** Nav column horizontal padding (matches create-link inset). */
export const DASHBOARD_NAV_HORIZONTAL_PADDING = 8

/** @deprecated Use DASHBOARD_SURFACE_BG — kept for any stale imports */
export const DASHBOARD_PANEL_BACKGROUND = DASHBOARD_SURFACE_BG

export const DEMO_USER_AVATAR_URL = 'https://github.com/raiyansarker.png'
