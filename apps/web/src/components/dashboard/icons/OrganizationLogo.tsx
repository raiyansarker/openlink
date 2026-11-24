import { VStack } from '@astryxdesign/core/VStack'
import { organizationInitials } from '#/lib/dashboard/org-initials'

type OrganizationLogoProps = {
  name: string
  size?: number
  /** Corner radius in px; defaults to a quarter of `size`. Pass the inner radius when the logo sits inside a rounded control. */
  radius?: number
  customImageUrl?: string
}

/**
 * Tile hues for workspaces without an uploaded logo — deep enough for white
 * initials in both light and dark mode. The name picks the hue, so a
 * workspace keeps its colour across loads and orgs sit distinguishably.
 */
const ORG_TILE_HUES = [
  '#2563EB', // blue
  '#4F46E5', // indigo
  '#7C3AED', // violet
  '#DB2777', // pink
  '#CA8A04', // amber
  '#16A34A', // green
  '#0D9488', // teal
  '#475569', // slate
] as const

/** `#RRGGBB` mixed toward black by `amount` (0–1) — gradient's darker stop. */
function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const channel = (shift: number) =>
    Math.round(((value >> shift) & 0xff) * (1 - amount))
    .toString(16)
    .padStart(2, '0')
  return `#${channel(16)}${channel(8)}${channel(0)}`
}

/** Stable hue index for a workspace name. */
function tileHueIndex(name: string): number {
  let hash = 0
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % ORG_TILE_HUES.length
}

function InitialsGlyph({ initials, hueIndex }: { initials: string; hueIndex: number }) {
  const base = ORG_TILE_HUES[hueIndex]
  // Same hue ⇒ same id everywhere, so repeated ids define identical gradients.
  const gradientId = `org-tile-${hueIndex}`
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={base} />
          <stop offset="1" stopColor={shade(base, 0.35)} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.02em"
        fontFamily="Geist Variable, sans-serif"
      >
        {initials}
      </text>
    </svg>
  )
}

/** The workspace's uploaded logo, or its initials on a named-hue gradient tile. */
export default function OrganizationLogo({
  name,
  size = 40,
  radius = Math.round(size / 4),
  customImageUrl,
}: OrganizationLogoProps) {
  if (customImageUrl) {
    return (
      <VStack width={size} height={size} hAlign="center" vAlign="center">
        <img
          src={customImageUrl}
          alt=""
          width={size}
          height={size}
          style={{
            display: 'block',
            width: size,
            height: size,
            borderRadius: radius,
            objectFit: 'cover',
          }}
        />
      </VStack>
    )
  }

  // The tile is drawn with its own corners; clipping makes it use `radius`.
  return (
    <VStack width={size} height={size} hAlign="center" vAlign="center" style={{ borderRadius: radius, overflow: 'hidden' }}>
      <InitialsGlyph initials={organizationInitials(name)} hueIndex={tileHueIndex(name)} />
    </VStack>
  )
}
