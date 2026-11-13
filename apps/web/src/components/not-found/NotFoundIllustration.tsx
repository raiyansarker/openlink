import { FOLDER_BLUE } from '#/components/links/folder-colors'

const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const SURFACE = 'var(--color-background-surface)'
const TINT = `color-mix(in oklab, ${FOLDER_BLUE} 14%, var(--color-background-surface))`
const TINT_STRONG = `color-mix(in oklab, ${FOLDER_BLUE} 26%, var(--color-background-surface))`

/**
 * 404 scene in the same language as EmptyFolderIllustration and
 * EmptyLinksIllustration: a browser card whose page is missing (dashed
 * placeholder, "404" in the address bar) and a magnifying glass still
 * searching. Black outlines, Dropbox-blue tints, sparkles. Decorative only.
 */
export default function NotFoundIllustration({ width = 240 }: { width?: number }) {
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
        <path d="M24 34v10M19 39h10" />
        <path d="M174 24v8M170 28h8" />
        <circle cx="180" cy="70" r="2.5" />
        <circle cx="18" cy="88" r="2" />
      </g>

      {/* Back card (offset, tinted) */}
      <rect
        x="50"
        y="20"
        width="112"
        height="80"
        rx="10"
        fill={TINT}
        stroke={INK}
        strokeWidth="1.75"
        transform="rotate(-5 106 60)"
      />

      {/* Browser card */}
      <rect x="34" y="30" width="122" height="88" rx="10" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
      {/* Title bar */}
      <path d="M34 50h122" stroke={INK} strokeWidth="1.5" />
      <circle cx="46" cy="40" r="2.5" fill={MUTED} />
      <circle cx="55" cy="40" r="2.5" fill={MUTED} />
      <circle cx="64" cy="40" r="2.5" fill={MUTED} />
      {/* Address bar reading "/404" */}
      <rect x="74" y="35" width="72" height="10" rx="5" fill={TINT} />
      <path d="M80 40h10" stroke={FOLDER_BLUE} strokeWidth="1.75" />
      {/* tiny "404" in the bar */}
      <g stroke={FOLDER_BLUE} strokeWidth="1.5">
        <path d="M96 37.5v3h3.2M98.4 37v6" />
        <rect x="101.2" y="37" width="3.2" height="6" rx="1.6" />
        <path d="M106.6 37.5v3h3.2M109 37v6" />
      </g>

      {/* The missing page: a dashed sheet with a broken corner */}
      <rect
        x="48"
        y="60"
        width="56"
        height="46"
        rx="6"
        stroke={MUTED}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <path d="M58 76h28M58 84h20M58 92h24" stroke={MUTED} strokeWidth="1.5" opacity="0.45" />

      {/* Magnifying glass, still searching */}
      <g transform="rotate(-12 132 86)">
        <circle cx="128" cy="82" r="20" fill={TINT_STRONG} stroke={INK} strokeWidth="1.75" />
        <circle cx="128" cy="82" r="14" fill={SURFACE} stroke={INK} strokeWidth="1.5" />
        {/* Question mark */}
        <path
          d="M123.5 78.5a4.5 4.5 0 1 1 6.6 4c-1.4.8-2.1 1.6-2.1 3"
          stroke={FOLDER_BLUE}
          strokeWidth="2"
        />
        <circle cx="128" cy="90.5" r="1.3" fill={FOLDER_BLUE} />
        {/* Handle */}
        <path d="M142.5 96.5l12 12" stroke={INK} strokeWidth="6" />
        <path d="M142.5 96.5l12 12" stroke={TINT_STRONG} strokeWidth="2.5" />
      </g>
    </svg>
  )
}
