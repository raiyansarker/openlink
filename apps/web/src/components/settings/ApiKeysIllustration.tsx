import { FOLDER_BLUE } from '#/components/links/folder-colors'

const INK = 'var(--color-text-primary)'
const SURFACE = 'var(--color-background-surface)'
const TINT = `color-mix(in oklab, ${FOLDER_BLUE} 14%, var(--color-background-surface))`
const TINT_STRONG = `color-mix(in oklab, ${FOLDER_BLUE} 26%, var(--color-background-surface))`

/**
 * Empty state for API keys: a key beside a terminal window, in the same line
 * style as the other empty-state illustrations. Decorative only.
 */
export default function ApiKeysIllustration({ width = 200 }: { width?: number }) {
  const height = Math.round(width * 0.7)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 200 140"
      fill="none"
      aria-hidden="true"
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="100" cy="128" rx="72" ry="6" fill={TINT} />

      {/* Terminal window */}
      <rect x="62" y="22" width="108" height="80" rx="10" fill={SURFACE} stroke={INK} strokeWidth="2" />
      <path d="M62 38h108" stroke={INK} strokeWidth="2" />
      <circle cx="74" cy="30" r="2.5" fill={INK} />
      <circle cx="83" cy="30" r="2.5" fill={INK} />
      <circle cx="92" cy="30" r="2.5" fill={INK} />
      {/* Prompt and a masked secret */}
      <path d="M76 54l7 6-7 6" stroke={FOLDER_BLUE} strokeWidth="2.25" />
      <rect x="90" y="57" width="52" height="6" rx="3" fill={TINT_STRONG} />
      <rect x="76" y="74" width="36" height="6" rx="3" fill={TINT_STRONG} />
      <rect x="76" y="86" width="58" height="6" rx="3" fill={TINT} />

      {/* Key */}
      <g transform="rotate(-28 58 92)">
        <circle cx="42" cy="92" r="17" fill={FOLDER_BLUE} stroke={INK} strokeWidth="2" />
        <circle cx="42" cy="92" r="6" fill={SURFACE} stroke={INK} strokeWidth="2" />
        <path d="M59 92h40" stroke={INK} strokeWidth="2" />
        <path d="M59 88h40v8H59z" fill={SURFACE} stroke={INK} strokeWidth="2" />
        <path d="M84 96v8M93 96v6" stroke={INK} strokeWidth="2" />
      </g>

      {/* Sparkles */}
      <g stroke={FOLDER_BLUE} strokeWidth="1.75">
        <path d="M30 34v8M26 38h8" />
        <path d="M178 14v6M175 17h6" />
        <path d="M184 92v6M181 95h6" />
      </g>
    </svg>
  )
}
