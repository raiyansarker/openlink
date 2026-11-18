import { VStack } from '@astryxdesign/core/VStack'
import { organizationInitials } from '#/lib/dashboard/org-initials'

type OrganizationLogoProps = {
  name: string
  size?: number
  /** Corner radius in px; defaults to a quarter of `size`. Pass the inner radius when the logo sits inside a rounded control. */
  radius?: number
  customImageUrl?: string
}

/** Tile colour behind a workspace's initials when it has no uploaded logo. */
const INITIALS_ACCENT = '#64748b'

function InitialsGlyph({ initials }: { initials: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill={INITIALS_ACCENT} />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="14"
        fontWeight="600"
        fontFamily="Geist Variable, sans-serif"
      >
        {initials}
      </text>
    </svg>
  )
}

/** The workspace's uploaded logo, or its initials. */
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
