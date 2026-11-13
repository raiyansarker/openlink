import { useMemo } from 'react'
import qrcode from 'qrcode-generator'

/**
 * Styled QR code: soft rounded-square data dots, rounded "eyes" (finder patterns) and a
 * link badge in the middle. The badge covers modules, so we encode with the
 * highest error correction (H, ~30% recoverable) and keep the badge small.
 *
 * Colors are literal (not theme tokens) so exported files look identical
 * everywhere and scanners always get dark-on-light.
 */

const QUIET_ZONE = 3
const INK = '#111113'
const ACCENT = '#0061FE'
const PAPER = '#ffffff'

/**
 * Data modules are full-size rounded squares. Tested with jsQR across sizes
 * and URL lengths: shrinking dots (round or 0.9 squircles) drops decode rate
 * from ~94% to ~69%; full-size with 0.3 corners matches a plain QR code.
 */
const DOT_SIZE = 1
const DOT_INSET = (1 - DOT_SIZE) / 2
const DOT_RADIUS = 0.3

type QrModel = {
  /** viewBox size in modules, quiet zone included. */
  box: number
  dots: Array<[number, number]>
  eyes: Array<[number, number]>
  badge: { x: number; size: number }
}

function buildModel(value: string): QrModel {
  const qr = qrcode(0, 'H')
  qr.addData(value)
  qr.make()
  const count = qr.getModuleCount()

  const eyes: Array<[number, number]> = [
    [0, 0],
    [count - 7, 0],
    [0, count - 7],
  ]
  const inEye = (r: number, c: number) =>
    eyes.some(([ex, ey]) => c >= ex && c < ex + 7 && r >= ey && r < ey + 7)

  // Odd-sized, centered badge ≈ 22% of the code, plus a 1-module margin.
  let badgeSize = Math.round(count * 0.22)
  if (badgeSize % 2 === 0) badgeSize += 1
  const badgeStart = (count - badgeSize) / 2
  const inBadge = (r: number, c: number) =>
    r >= badgeStart - 1 &&
    r < badgeStart + badgeSize + 1 &&
    c >= badgeStart - 1 &&
    c < badgeStart + badgeSize + 1

  const dots: Array<[number, number]> = []
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c) && !inEye(r, c) && !inBadge(r, c)) {
        dots.push([c + QUIET_ZONE, r + QUIET_ZONE])
      }
    }
  }

  return {
    box: count + QUIET_ZONE * 2,
    dots,
    eyes: eyes.map(([x, y]) => [x + QUIET_ZONE, y + QUIET_ZONE]),
    badge: { x: badgeStart + QUIET_ZONE, size: badgeSize },
  }
}

/** Chain-link glyph, drawn in a 24-unit box. */
const LINK_GLYPH =
  'M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5'

/** Standalone SVG markup for downloads (same drawing as the component). */
export function qrSvgMarkup(value: string, size = 1024): string {
  const { box, dots, eyes, badge } = buildModel(value)
  const dotMarkup = dots
    .map(
      ([x, y]) =>
        `<rect x="${x + DOT_INSET}" y="${y + DOT_INSET}" width="${DOT_SIZE}" height="${DOT_SIZE}" rx="${DOT_RADIUS}"/>`,
    )
    .join('')
  const eyeMarkup = eyes
    .map(
      ([x, y]) =>
        `<rect x="${x + 0.5}" y="${y + 0.5}" width="6" height="6" rx="2" fill="none" stroke="${ACCENT}" stroke-width="1"/>` +
        `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="1" fill="${ACCENT}"/>`,
    )
    .join('')
  const g = badge.size / 24
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${box} ${box}">` +
    `<rect width="${box}" height="${box}" rx="${box * 0.06}" fill="${PAPER}"/>` +
    `<g fill="${INK}">${dotMarkup}</g>${eyeMarkup}` +
    `<rect x="${badge.x}" y="${badge.x}" width="${badge.size}" height="${badge.size}" rx="${badge.size * 0.28}" fill="${ACCENT}"/>` +
    `<g transform="translate(${badge.x + badge.size * 0.2} ${badge.x + badge.size * 0.2}) scale(${g * 0.6})" fill="none" stroke="${PAPER}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="${LINK_GLYPH}"/></g>` +
    `</svg>`
  )
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function downloadQrSvg(value: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([qrSvgMarkup(value)], { type: 'image/svg+xml' }),
  )
  triggerDownload(url, `${filename}.svg`)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadQrPng(value: string, filename: string, size = 1024) {
  const image = new Image()
  const svgUrl = URL.createObjectURL(
    new Blob([qrSvgMarkup(value, size)], { type: 'image/svg+xml' }),
  )
  image.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(image, 0, 0, size, size)
      triggerDownload(canvas.toDataURL('image/png'), `${filename}.png`)
    }
    URL.revokeObjectURL(svgUrl)
  }
  image.src = svgUrl
}

type QrCodeProps = {
  value: string
  /** Rendered width/height in px. */
  size?: number
  /** Accessible description, e.g. "QR code for github.olink/launch". */
  label: string
}

export default function QrCode({ value, size = 180, label }: QrCodeProps) {
  const { box, dots, eyes, badge } = useMemo(() => buildModel(value), [value])
  const g = badge.size / 24

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
      <rect width={box} height={box} rx={box * 0.06} fill={PAPER} />
      <g fill={INK}>
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
      <rect
        x={badge.x}
        y={badge.x}
        width={badge.size}
        height={badge.size}
        rx={badge.size * 0.28}
        fill={ACCENT}
      />
      <g
        transform={`translate(${badge.x + badge.size * 0.2} ${badge.x + badge.size * 0.2}) scale(${g * 0.6})`}
        fill="none"
        stroke={PAPER}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={LINK_GLYPH} />
      </g>
    </svg>
  )
}
