import { useMemo } from 'react'
import { useResolvedColorScheme } from '#/hooks/use-resolved-color-scheme'
import {
  ACCENT,
  buildModel,
  DARK,
  DOT_INSET,
  DOT_RADIUS,
  DOT_SIZE,
  LIGHT,
  MARK_BOX,
  MARK_RADIUS,
  MARK_STROKE,
  MARK_STROKE_WIDTH,
  MARK_STROKES,
  MARK_TRANSFORM,
} from '#/lib/links/qr-code'

type QrCodeProps = {
  value: string
  /** Rendered width/height in px. */
  size?: number
  /** Accessible description, e.g. "QR code for github.olink/launch". */
  label: string
}

/** The on-screen code, in the current color scheme. */
export default function QrCode({ value, size = 180, label }: QrCodeProps) {
  const { box, dots, eyes, badge } = useMemo(() => buildModel(value), [value])
  const palette = useResolvedColorScheme() === 'dark' ? DARK : LIGHT

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      role="img"
      aria-label={label}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width={box} height={box} rx={box * 0.06} fill={palette.paper} />
      <g fill={palette.ink}>
        {dots.map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x + DOT_INSET}
            y={y + DOT_INSET}
            width={DOT_SIZE}
            height={DOT_SIZE}
            rx={DOT_RADIUS}
          />
        ))}
      </g>
      {eyes.map(([x, y]) => (
        <g key={`eye-${x}-${y}`}>
          <rect
            x={x + 0.5}
            y={y + 0.5}
            width={6}
            height={6}
            rx={2}
            fill="none"
            stroke={ACCENT}
            strokeWidth={1}
          />
          <rect x={x + 2} y={y + 2} width={3} height={3} rx={1} fill={ACCENT} />
        </g>
      ))}
      <g transform={`translate(${badge.x} ${badge.x}) scale(${badge.size / MARK_BOX})`}>
        <rect width={MARK_BOX} height={MARK_BOX} rx={MARK_RADIUS} fill={ACCENT} />
        <g
          transform={MARK_TRANSFORM}
          fill="none"
          stroke={MARK_STROKE}
          strokeWidth={MARK_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {MARK_STROKES.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
    </svg>
  )
}
