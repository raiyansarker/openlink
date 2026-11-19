import type { ReactNode } from 'react'
import { FOLDER_BLUE } from '#/components/links/folder-colors'

const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const SURFACE = 'var(--color-background-surface)'
const TINT = `color-mix(in oklab, ${FOLDER_BLUE} 14%, var(--color-background-surface))`
const TINT_STRONG = `color-mix(in oklab, ${FOLDER_BLUE} 26%, var(--color-background-surface))`
const SUCCESS = 'light-dark(#16a34a, #4ade80)'
const SUCCESS_TINT = `color-mix(in oklab, ${SUCCESS} 22%, var(--color-background-surface))`

type IllustrationProps = { width?: number }

function Frame({ width = 200, children }: IllustrationProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={Math.round(width * 0.7)}
      viewBox="0 0 200 140"
      fill="none"
      aria-hidden="true"
      focusable="false"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="100" cy="128" rx="64" ry="6" fill={TINT} />
      {children}
    </svg>
  )
}

/** An opened envelope with a check badge: the email is confirmed. Decorative only. */
export function EmailVerifiedIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <g stroke={FOLDER_BLUE} strokeWidth="1.75">
        <path d="M30 34v10M25 39h10" />
        <path d="M170 28v8M166 32h8" />
        <circle cx="180" cy="80" r="2.5" />
        <circle cx="20" cy="86" r="2" />
      </g>
      {/* Letter peeking out of the envelope */}
      <rect x="62" y="28" width="76" height="56" rx="6" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
      <path d="M74 44h40M74 54h52M74 64h30" stroke={MUTED} strokeWidth="1.5" opacity="0.45" />
      {/* Envelope body and flap */}
      <path d="M44 62l56 34 56-34v50a8 8 0 0 1-8 8H52a8 8 0 0 1-8-8z" fill={TINT_STRONG} stroke={INK} strokeWidth="1.75" />
      <path d="M44 62l56 34 56-34" stroke={INK} strokeWidth="1.75" />
      {/* Check badge */}
      <circle cx="150" cy="40" r="16" fill={SUCCESS_TINT} stroke={INK} strokeWidth="1.75" />
      <path d="M142 40.5l5.5 5.5L158 35" stroke={SUCCESS} strokeWidth="3" />
    </Frame>
  )
}

/** A broken link with an hourglass: the link ran out. Decorative only. */
export function LinkExpiredIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <g stroke={FOLDER_BLUE} strokeWidth="1.75">
        <path d="M28 30v10M23 35h10" />
        <circle cx="176" cy="96" r="2.5" />
        <circle cx="22" cy="92" r="2" />
      </g>
      {/* Two halves of a chain link, pulled apart */}
      <g stroke={INK} strokeWidth="1.75" fill={SURFACE}>
        <rect x="36" y="82" width="46" height="22" rx="11" transform="rotate(-18 59 93)" />
        <rect x="118" y="82" width="46" height="22" rx="11" transform="rotate(-18 141 93)" />
      </g>
      <path d="M90 94l6-2M104 90l6-2" stroke={MUTED} strokeWidth="1.75" opacity="0.5" />
      {/* Hourglass above the gap */}
      <g transform="translate(88 20)">
        <circle cx="12" cy="24" r="28" fill={TINT_STRONG} stroke={INK} strokeWidth="1.75" />
        <path d="M2 8h20M2 40h20" stroke={INK} strokeWidth="2" />
        <path d="M4 8c0 10 7 12 8 16-1 4-8 6-8 16M20 8c0 10-7 12-8 16 1 4 8 6 8 16" fill={SURFACE} stroke={INK} strokeWidth="1.6" />
        <path d="M7 37c2-3 3.5-4 5-4s3 1 5 4z" fill={FOLDER_BLUE} />
      </g>
    </Frame>
  )
}

/** A key over a password field: choose a new password. Decorative only. */
export function PasswordKeyIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <g stroke={FOLDER_BLUE} strokeWidth="1.75">
        <path d="M28 28v10M23 33h10" />
        <path d="M172 24v8M168 28h8" />
        <circle cx="182" cy="70" r="2.5" />
      </g>
      {/* Password field */}
      <rect x="34" y="68" width="132" height="40" rx="10" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
      <g fill={MUTED} opacity="0.55">
        <circle cx="54" cy="88" r="3" />
        <circle cx="68" cy="88" r="3" />
        <circle cx="82" cy="88" r="3" />
        <circle cx="96" cy="88" r="3" />
        <circle cx="110" cy="88" r="3" />
      </g>
      {/* Key */}
      <g transform="rotate(-28 128 50)">
        <circle cx="106" cy="50" r="15" fill={TINT_STRONG} stroke={INK} strokeWidth="1.75" />
        <circle cx="106" cy="50" r="5" fill={SURFACE} stroke={INK} strokeWidth="1.5" />
        <path d="M121 50h36M146 50v10M154 50v8" stroke={INK} strokeWidth="2.5" />
      </g>
    </Frame>
  )
}

/** A sealed envelope on its way, with motion lines: a link was just sent. Decorative only. */
export function CheckInboxIllustration(props: IllustrationProps) {
  return (
    <Frame {...props}>
      <g stroke={FOLDER_BLUE} strokeWidth="1.75">
        <path d="M30 32v10M25 37h10" />
        <path d="M172 26v8M168 30h8" />
        <circle cx="180" cy="84" r="2.5" />
      </g>
      {/* Motion lines behind the envelope */}
      <g stroke={MUTED} strokeWidth="1.75" opacity="0.45">
        <path d="M18 64h22M24 78h16M14 92h26" />
      </g>
      <rect x="48" y="40" width="112" height="76" rx="9" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
      <path d="M48 49l56 38 56-38" fill={TINT_STRONG} stroke={INK} strokeWidth="1.75" />
      <path d="M48 108l38-30M160 108l-38-30" stroke={INK} strokeWidth="1.5" opacity="0.55" />
      {/* Unread badge */}
      <circle cx="156" cy="42" r="12" fill={FOLDER_BLUE} stroke={INK} strokeWidth="1.75" />
      <path d="M156 37v6" stroke={SURFACE} strokeWidth="2.5" />
      <circle cx="156" cy="47.5" r="1.4" fill={SURFACE} />
    </Frame>
  )
}
