type OpenLinkAppMarkProps = {
  size?: number
}

/**
 * OpenLink mark — a lasso. A rope rises from the lower left, curls once, and
 * closes in a loop: catching a destination. Neutral tile, brand orange knot.
 */
export default function OpenLinkAppMark({ size = 36 }: OpenLinkAppMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        rx="11"
        fill="#161616"
        stroke="rgba(255,255,255,0.14)"
      />
      {/* Rope: from the hand, one curl, up to the knot */}
      <path
        d="M9.5 31.5c2.6-.4 4.4-2.2 4.6-4.4.2-2-1.6-3.2-3-2.3-1.5 1-.6 3.4 1.6 3.6 2.6.2 4.4-2.4 5.6-5.4"
        stroke="#fafafa"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Loop */}
      <ellipse
        cx="24.4"
        cy="15.6"
        rx="8.2"
        ry="6.4"
        transform="rotate(-24 24.4 15.6)"
        stroke="#fafafa"
        strokeWidth="2.2"
      />
      {/* Knot (honda) where rope meets loop */}
      <circle cx="18.6" cy="21.2" r="2.3" fill="var(--openlink-brand, #FF4602)" />
    </svg>
  )
}
