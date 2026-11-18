type OpenLinkAppMarkProps = {
  size?: number
  /**
   * `light`: white tile (`public/logo-light.svg`).
   * `dark`: black tile (`public/logo-dark.svg`).
   * `auto`: black tile in light mode, white tile in dark mode.
   */
  variant?: 'light' | 'dark' | 'auto'
}

const ORANGE = '#F2541B'
const INK = '#111418'
const PAPER = '#FAFAF7'

/** The OpenLink logo: two slashes on a rounded tile. */
export default function OpenLinkAppMark({ size = 36, variant = 'auto' }: OpenLinkAppMarkProps) {
  const tile =
    variant === 'light'
      ? { fill: PAPER, stroke: INK }
      : variant === 'dark'
        ? { fill: INK, stroke: 'none' }
        : { fill: `light-dark(${INK}, ${PAPER})`, stroke: `light-dark(transparent, ${INK})` }
  const first = variant === 'light' ? INK : variant === 'dark' ? PAPER : `light-dark(${PAPER}, ${INK})`
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden>
      <rect
        x="1.333"
        y="1.333"
        width="93.333"
        height="93.333"
        rx="22.667"
        strokeWidth="2.667"
        style={tile}
      />
      <g
        transform="translate(9.842 9.842) scale(0.763158)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M28 78L48 22" style={{ stroke: first }} />
        <path d="M52 78L72 22" stroke={ORANGE} />
      </g>
    </svg>
  )
}
