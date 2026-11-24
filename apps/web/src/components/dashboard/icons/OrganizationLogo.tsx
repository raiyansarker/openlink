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
 * Tile palettes for workspaces without an uploaded logo — a light pastel
 * gradient with initials in its deeper hue, so the tile reads as a light chip
 * on the dark org rail. The name picks the palette, so a workspace keeps its
 * colour across loads and orgs sit distinguishably.
 */
const ORG_TILE_PALETTES = [
  { from: '#DBEAFE', to: '#BFDBFE', text: '#1D4ED8' }, // blue
  { from: '#E0E7FF', to: '#C7D2FE', text: '#4338CA' }, // indigo
  { from: '#EDE9FE', to: '#DDD6FE', text: '#6D28D9' }, // violet
  { from: '#FCE7F3', to: '#FBCFE8', text: '#BE185D' }, // pink
  { from: '#FEF3C7', to: '#FDE68A', text: '#B45309' }, // amber
  { from: '#DCFCE7', to: '#BBF7D0', text: '#15803D' }, // green
  { from: '#CCFBF1', to: '#99F6E4', text: '#0F766E' }, // teal
  { from: '#F1F5F9', to: '#E2E8F0', text: '#475569' }, // slate
] as const

/** Stable palette index for a workspace name. */
function tileHueIndex(name: string): number {
  let hash = 0
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % ORG_TILE_PALETTES.length
}

function InitialsGlyph({ initials, hueIndex }: { initials: string; hueIndex: number }) {
  const palette = ORG_TILE_PALETTES[hueIndex]
  // Same palette ⇒ same id everywhere, so repeated ids define identical gradients.
  const gradientId = `org-tile-${hueIndex}`
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.from} />
          <stop offset="1" stopColor={palette.to} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradientId})`} />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fill={palette.text}
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
