const RAIL_WIDTH_PX = 20
const RAIL_COLOR = 'var(--color-border-emphasized)'

/** Small drawn connector: hollow ring, dashed line with an arrowhead, filled node. */
export default function RouteRail() {
  return (
    <svg
      width={RAIL_WIDTH_PX}
      height="100%"
      viewBox="0 0 20 64"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, alignSelf: 'stretch', minHeight: 64 }}
    >
      <circle cx="10" cy="6" r="4" fill="none" stroke={RAIL_COLOR} strokeWidth="1.5" />
      <line
        x1="10"
        y1="12"
        x2="10"
        y2="50"
        stroke={RAIL_COLOR}
        strokeWidth="1.5"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M6 46 L10 52 L14 46"
        fill="none"
        stroke={RAIL_COLOR}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="58" r="4" fill={RAIL_COLOR} />
    </svg>
  )
}
