import { FOLDER_BLUE } from '#/components/links/folder-colors'

type EmptyFolderIllustrationProps = {
  /** `folder`: an open, empty folder. `root`: a folder with links ready to file. */
  variant?: 'folder' | 'root'
  width?: number
}

const INK = 'var(--color-text-primary)'
const MUTED = 'var(--color-text-secondary)'
const SURFACE = 'var(--color-background-surface)'
const TINT = `color-mix(in oklab, ${FOLDER_BLUE} 14%, var(--color-background-surface))`
const TINT_STRONG = `color-mix(in oklab, ${FOLDER_BLUE} 26%, var(--color-background-surface))`

/**
 * Line illustration for empty states: black outlines, Dropbox-blue fills,
 * neutral surfaces. Decorative only.
 */
export default function EmptyFolderIllustration({
  variant = 'folder',
  width = 200,
}: EmptyFolderIllustrationProps) {
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
        <path d="M30 34v10M25 39h10" />
        <path d="M168 22v8M164 26h8" />
        <circle cx="176" cy="62" r="2.5" />
        <circle cx="22" cy="78" r="2" />
      </g>

      {variant === 'root' ? (
        <>
          {/* Link cards floating above, waiting to be filed */}
          <g transform="rotate(-8 74 40)">
            <rect x="52" y="24" width="48" height="30" rx="6" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
            <path d="M61 39h4a4 4 0 0 0 0-8h-4M71 31h4a4 4 0 0 1 0 8h-4M64 35h8" stroke={FOLDER_BLUE} strokeWidth="1.75" />
            <path d="M84 33h9M84 39h6" stroke={MUTED} strokeWidth="1.5" />
          </g>
          <g transform="rotate(7 128 32)">
            <rect x="104" y="16" width="48" height="30" rx="6" fill={SURFACE} stroke={INK} strokeWidth="1.75" />
            <path d="M113 31h4a4 4 0 0 0 0-8h-4M123 23h4a4 4 0 0 1 0 8h-4M116 27h8" stroke={FOLDER_BLUE} strokeWidth="1.75" />
            <path d="M136 25h9M136 31h6" stroke={MUTED} strokeWidth="1.5" />
          </g>
          {/* Motion hint */}
          <path d="M100 60v8M94 64l6 6 6-6" stroke={MUTED} strokeWidth="1.5" />
        </>
      ) : (
        <>
          {/* Dashed placeholder sheet peeking out of the folder */}
          <rect
            x="70"
            y="30"
            width="60"
            height="52"
            rx="6"
            fill={SURFACE}
            stroke={MUTED}
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path d="M100 46v14M93 53h14" stroke={MUTED} strokeWidth="1.75" />
        </>
      )}

      {/* Folder back with tab */}
      <path
        d="M44 70a8 8 0 0 1 8-8h22a6 6 0 0 1 4.6 2.15l4.2 5A6 6 0 0 0 87.4 71H148a8 8 0 0 1 8 8v38a8 8 0 0 1-8 8H52a8 8 0 0 1-8-8Z"
        fill={TINT_STRONG}
        stroke={INK}
        strokeWidth="1.75"
      />
      {/* Folder front flap, slightly open */}
      <path
        d="M40 86a6 6 0 0 1 6-6h108a6 6 0 0 1 5.9 7.1l-5.5 30A8 8 0 0 1 146.5 124H53.5a8 8 0 0 1-7.9-6.9l-5.5-30A6 6 0 0 1 40 86Z"
        fill={TINT}
        stroke={INK}
        strokeWidth="1.75"
      />
      {/* Flap highlight */}
      <path d="M58 92h22" stroke={FOLDER_BLUE} strokeWidth="2" opacity="0.6" />
    </svg>
  )
}
