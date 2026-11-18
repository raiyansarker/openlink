import qrcode from 'qrcode-generator'

/**
 * Styled QR code: soft rounded-square data dots, rounded "eyes" (finder patterns) and the
 * OpenLink mark in the middle. The mark covers modules, so we encode with the
 * highest error correction (H, ~30% recoverable) and keep the mark small.
 *
 * Colors are literal (not theme tokens) so exported files look identical
 * everywhere. Downloads are always dark-on-light, which every scanner reads.
 */

export type QrPalette = { paper: string; ink: string }

/** Brand orange, from the logo. */
export const ACCENT = '#F2541B'
/** The logo's light stroke. */
export const MARK_STROKE = '#FAFAF7'
export const LIGHT: QrPalette = { paper: '#ffffff', ink: '#111113' }
/**
 * On screen in dark mode the code sits on the dark surface with light dots.
 * Phone camera apps read inverted codes; files you download stay `LIGHT`.
 */
export const DARK: QrPalette = { paper: '#18181b', ink: '#FAFAF7' }

const QUIET_ZONE = 3

/**
 * Data modules are full-size rounded squares. Tested with jsQR across sizes
 * and URL lengths: shrinking dots (round or 0.9 squircles) drops decode rate
 * from ~94% to ~69%; full-size with 0.3 corners matches a plain QR code.
 */
export const DOT_SIZE = 1
export const DOT_INSET = (1 - DOT_SIZE) / 2
export const DOT_RADIUS = 0.3

type QrModel = {
  /** viewBox size in modules, quiet zone included. */
  box: number
  dots: Array<[number, number]>
  eyes: Array<[number, number]>
  badge: { x: number; size: number }
}

/**
 * The URL a QR code encodes: the short link plus `?qr`, so the redirect engine
 * can count scans separately. The visitor still lands on the same destination.
 */
export function qrTarget(shortUrl: string): string {
  try {
    const url = new URL(shortUrl)
    if (!url.searchParams.has('qr')) url.searchParams.set('qr', '')
    // `?qr` rather than `?qr=`, which encodes to a smaller code.
    return url.toString().replace(/([?&]qr)=(?=&|$)/, '$1')
  } catch {
    return shortUrl
  }
}

export function buildModel(shortUrl: string): QrModel {
  const value = qrTarget(shortUrl)
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

/**
 * The OpenLink mark (`public/logo-*.svg`): two slanted strokes in a rounded
 * square, drawn here on brand orange. In the logo's 96-unit box.
 */
export const MARK_BOX = 96
export const MARK_RADIUS = 24
export const MARK_TRANSFORM = 'translate(9.842 9.842) scale(0.763158)'
export const MARK_STROKES = ['M28 78L48 22', 'M52 78L72 22']
export const MARK_STROKE_WIDTH = 12

/** Standalone SVG markup for downloads (same drawing as the component, always light). */
export function qrSvgMarkup(value: string, size = 1024, palette: QrPalette = LIGHT): string {
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
  const markMarkup =
    `<g transform="translate(${badge.x} ${badge.x}) scale(${badge.size / MARK_BOX})">` +
    `<rect width="${MARK_BOX}" height="${MARK_BOX}" rx="${MARK_RADIUS}" fill="${ACCENT}"/>` +
    `<g transform="${MARK_TRANSFORM}" fill="none" stroke="${MARK_STROKE}" stroke-width="${MARK_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">` +
    MARK_STROKES.map((d) => `<path d="${d}"/>`).join('') +
    `</g></g>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${box} ${box}">` +
    `<rect width="${box}" height="${box}" rx="${box * 0.06}" fill="${palette.paper}"/>` +
    `<g fill="${palette.ink}">${dotMarkup}</g>${eyeMarkup}${markMarkup}` +
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

