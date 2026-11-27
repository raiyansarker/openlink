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
 * Tile for workspaces without an uploaded logo — a light grey gradient (the
 * shell's zinc family, 50→200) with the initials in zinc-700. Neutral in both
 * light and dark shells; the tile reads as a light chip on the dark org rail.
 */
const TILE_GRADIENT = { from: '#FAFAFA', to: '#E4E4E7' }
const TILE_TEXT = '#3F3F46'

function InitialsGlyph({ initials }: { initials: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="org-tile-grey" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={TILE_GRADIENT.from} />
          <stop offset="1" stopColor={TILE_GRADIENT.to} />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#org-tile-grey)" />
      <text
        x="20"
        y="24.5"
        textAnchor="middle"
        fill={TILE_TEXT}
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
      <InitialsGlyph initials={organizationInitials(name)} />
    </VStack>
  )
}
