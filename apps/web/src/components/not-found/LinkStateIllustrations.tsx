import type { ReactNode } from 'react'
import { FOLDER_BLUE } from '#/components/links/folder-colors'

const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const SURFACE = 'var(--color-background-surface)'
const TINT = `color-mix(in oklab, ${FOLDER_BLUE} 14%, var(--color-background-surface))`
const TINT_STRONG = `color-mix(in oklab, ${FOLDER_BLUE} 26%, var(--color-background-surface))`

type IllustrationProps = { width?: number }

/** Shared frame: shadow, sparkles, tilted back card and the link card in front. */
function LinkCard({ width = 240, children }: IllustrationProps & { children: ReactNode }) {
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
      <ellipse cx="100" cy="128" rx="70" ry="6" fill={TINT} />
      <g stroke={FOLDER_BLUE} strokeWidth="1.75">
        <path d="M26 30v10M21 35h10" />
        <path d="M172 22v8M168 26h8" />
        <circle cx="182" cy="74" r="2.5" />
        <circle cx="16" cy="92" r="2" />
      </g>
      <rect x="44" y="24" width="112" height="78" rx="10" fill={TINT} stroke={INK} strokeWidth="1.75" transform="rotate(5 100 63)" />
      <rect x="38" y="32" width="124" height="86" rx="10" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
      {/* A short link on the card: chain mark and a slug line */}
      <g stroke={INK} strokeWidth="1.5">
        <rect x="50" y="44" width="14" height="8" rx="4" />
        <rect x="58" y="44" width="14" height="8" rx="4" />
      </g>
      <path d="M80 48h44" stroke={MUTED} strokeWidth="1.5" opacity="0.5" />
      {children}
    </svg>
  )
}

/** A link whose time ran out: an hourglass on the card. Decorative only. */
export function ExpiredLinkIllustration(props: IllustrationProps) {
  return (
    <LinkCard {...props}>
      <path d="M50 70h40M50 80h28M50 90h34" stroke={MUTED} strokeWidth="1.5" opacity="0.35" />
      <g transform="translate(120 66)">
        <circle cx="10" cy="20" r="24" fill={TINT_STRONG} stroke={INK} strokeWidth="1.75" />
        <path d="M0 4h20M0 36h20" stroke={INK} strokeWidth="2" />
        <path d="M2 4c0 9 7 11 8 16-1 5-8 7-8 16M18 4c0 9-7 11-8 16 1 5 8 7 8 16" fill={SURFACE} stroke={INK} strokeWidth="1.6" />
        <path d="M5 33c2-3 3.5-4 5-4s3 1 5 4z" fill={FOLDER_BLUE} />
        <path d="M10 22v4" stroke={FOLDER_BLUE} strokeWidth="1.5" />
      </g>
    </LinkCard>
  )
}

/** A password-protected link: a padlock on the card. Decorative only. */
export function LockedLinkIllustration(props: IllustrationProps) {
  return (
    <LinkCard {...props}>
      <g stroke={MUTED} strokeWidth="1.5" opacity="0.5">
        <circle cx="54" cy="78" r="2" />
        <circle cx="62" cy="78" r="2" />
        <circle cx="70" cy="78" r="2" />
        <circle cx="78" cy="78" r="2" />
      </g>
      <path d="M50 94h36" stroke={MUTED} strokeWidth="1.5" opacity="0.35" />
      <g transform="translate(112 62)">
        <path d="M10 22v-8a10 10 0 0 1 20 0v8" stroke={INK} strokeWidth="2.5" />
        <path d="M10 22v-8a10 10 0 0 1 20 0v8" stroke={TINT_STRONG} strokeWidth="1" />
        <rect x="2" y="22" width="36" height="28" rx="6" fill={TINT_STRONG} stroke={INK} strokeWidth="1.75" />
        <circle cx="20" cy="33" r="3.5" fill={FOLDER_BLUE} />
        <path d="M20 36v6" stroke={FOLDER_BLUE} strokeWidth="2.5" />
      </g>
    </LinkCard>
  )
}
