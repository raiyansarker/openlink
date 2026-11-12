import type { DomainReadiness } from '#/data/demo/domains'

/**
 * Same palette as the links empty-state illustrations (Dropbox blue, lifted in
 * dark mode). Kept local so domains do not depend on the links feature.
 */
const ACCENT = 'light-dark(#0061FE, #4D8DFF)'
const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const SURFACE = 'var(--color-background-surface)'
const TINT = `color-mix(in oklab, ${ACCENT} 14%, var(--color-background-surface))`
const TINT_STRONG = `color-mix(in oklab, ${ACCENT} 26%, var(--color-background-surface))`

export type DomainIllustrationState = DomainReadiness | 'add'

type DomainIllustrationProps = {
  state: DomainIllustrationState
  width?: number
}

/** Small glyph inside the round node on the connector. */
function StatusGlyph({ state }: { state: DomainIllustrationState }) {
  switch (state) {
    case 'active':
      return <path d="M118.5 60.5l3 3 6-6.5" stroke={ACCENT} strokeWidth="2" />
    case 'failed':
      return <path d="M119.5 56.5l7 7M126.5 56.5l-7 7" stroke={INK} strokeWidth="2" />
    case 'add':
      return <path d="M123 55.5v9M118.5 60h9" stroke={ACCENT} strokeWidth="2" />
    default:
      // pending / verifying: a clock.
      return <path d="M123 55.5V60l3 2" stroke={INK} strokeWidth="1.75" />
  }
}

/**
 * Line illustration: a browser showing your custom domain, wired to the
 * internet. The connector reflects DNS state — solid when active, dashed while
 * pending or verifying, broken when misconfigured. Decorative only.
 */
export default function DomainIllustration({
  state,
  width = 200,
}: DomainIllustrationProps) {
  const height = Math.round(width * 0.6)
  const isActive = state === 'active'
  const isFailed = state === 'failed'
  const isWaiting = state === 'pending' || state === 'verifying'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 200 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Ground shadow */}
      <ellipse cx="100" cy="108" rx="78" ry="5" fill={TINT} />

      {/* Sparkles */}
      <g stroke={ACCENT} strokeWidth="1.5">
        <path d="M14 22v8M10 26h8" />
        <path d="M186 90v7M182.5 93.5h7" />
        <circle cx="190" cy="24" r="2" />
      </g>

      {/* Back card for depth */}
      <rect
        x="26"
        y="22"
        width="84"
        height="62"
        rx="9"
        fill={TINT}
        stroke={INK}
        strokeWidth="1.5"
        transform="rotate(-5 68 53)"
      />

      {/* Browser card */}
      <rect x="14" y="30" width="92" height="66" rx="9" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
      <path d="M14 46h92" stroke={INK} strokeWidth="1.5" />
      <circle cx="24" cy="38" r="2.25" fill={MUTED} />
      <circle cx="32" cy="38" r="2.25" fill={MUTED} />
      {/* Address bar holding the custom domain */}
      <rect x="40" y="33.5" width="60" height="9" rx="4.5" fill={TINT_STRONG} />
      <path
        d="M45 38h30"
        stroke={isActive || state === 'add' ? ACCENT : MUTED}
        strokeWidth="1.75"
      />
      {/* Page content lines */}
      <path d="M24 60h40M24 68h28M24 76h34" stroke={MUTED} strokeWidth="1.5" opacity="0.55" />

      {/* Connector: browser → globe */}
      {isFailed ? (
        <g stroke={MUTED} strokeWidth="2">
          <path d="M106 60h7" />
          <path d="M133 60h7" />
        </g>
      ) : (
        <path
          d="M106 60h34"
          stroke={isActive ? ACCENT : MUTED}
          strokeWidth="2"
          strokeDasharray={isWaiting || state === 'add' ? '3 4' : undefined}
        />
      )}

      {/* Status node */}
      <circle cx="123" cy="60" r="9" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
      {isWaiting ? <circle cx="123" cy="60" r="5" stroke={INK} strokeWidth="1.5" /> : null}
      <StatusGlyph state={state} />

      {/* Globe */}
      <circle cx="164" cy="60" r="22" fill={isActive ? TINT_STRONG : TINT} stroke={INK} strokeWidth="1.75" />
      <ellipse cx="164" cy="60" rx="9.5" ry="22" stroke={INK} strokeWidth="1.5" />
      <path d="M142 60h44M145 49h38M145 71h38" stroke={INK} strokeWidth="1.5" />
    </svg>
  )
}
