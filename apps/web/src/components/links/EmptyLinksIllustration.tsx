import { FOLDER_BLUE } from '#/components/links/folder-colors'

type EmptyLinksIllustrationProps = {
  width?: number
}

const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const SURFACE = 'var(--color-background-surface)'
const TINT = `color-mix(in oklab, ${FOLDER_BLUE} 14%, var(--color-background-surface))`
const TINT_STRONG = `color-mix(in oklab, ${FOLDER_BLUE} 26%, var(--color-background-surface))`

/**
 * Empty-links illustration, same language as EmptyFolderIllustration:
 * a browser card with a short link, a big chain link and a cursor.
 */
export default function EmptyLinksIllustration({
  width = 200,
}: EmptyLinksIllustrationProps) {
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
      {/* Ground shadow */}
      <ellipse cx="100" cy="128" rx="70" ry="6" fill={TINT} />

      {/* Sparkles */}
      <g stroke={FOLDER_BLUE} strokeWidth="1.75">
        <path d="M26 30v10M21 35h10" />
        <path d="M172 92v8M168 96h8" />
        <circle cx="178" cy="40" r="2.5" />
        <circle cx="20" cy="86" r="2" />
      </g>

      {/* Back card (another link, offset) */}
      <rect
        x="56"
        y="22"
        width="112"
        height="74"
        rx="10"
        fill={TINT}
        stroke={INK}
        strokeWidth="1.75"
        transform="rotate(6 112 59)"
      />

      {/* Browser card */}
      <rect x="34" y="34" width="120" height="84" rx="10" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
      {/* Title bar */}
      <path d="M34 54h120" stroke={INK} strokeWidth="1.5" />
      <circle cx="46" cy="44" r="2.5" fill={MUTED} />
      <circle cx="55" cy="44" r="2.5" fill={MUTED} />
      <circle cx="64" cy="44" r="2.5" fill={MUTED} />
      {/* Address bar with a short link */}
      <rect x="74" y="39" width="70" height="10" rx="5" fill={TINT} />
      <path d="M80 44h22" stroke={FOLDER_BLUE} strokeWidth="1.75" />

      {/* Big chain link */}
      <g transform="rotate(-35 94 86)">
        <rect x="64" y="76" width="34" height="20" rx="10" fill={TINT_STRONG} stroke={INK} strokeWidth="2" />
        <rect x="90" y="76" width="34" height="20" rx="10" fill="none" stroke={INK} strokeWidth="2" />
        <path d="M84 86h20" stroke={FOLDER_BLUE} strokeWidth="2.25" />
      </g>

      {/* Placeholder text lines */}
      <path d="M46 104h28M46 110h18" stroke={MUTED} strokeWidth="1.5" opacity="0.6" />

      {/* Cursor */}
      <path
        d="M138 98l14 6-6 2-2 6Z"
        fill={SURFACE}
        stroke={INK}
        strokeWidth="1.5"
      />
    </svg>
  )
}
