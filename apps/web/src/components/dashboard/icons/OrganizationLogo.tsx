import { useId } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import type { OrganizationBrand } from '#/data/demo/organization-branding'
import { organizationInitials } from '#/lib/dashboard/org-initials'

type OrganizationLogoProps = {
  name: string
  brand: OrganizationBrand
  size?: number
}

function OpenLinkGlyph({ gradId }: { gradId: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#FF6B33" />
          <stop offset="100%" stopColor="#FF4602" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      <path
        fill="#fff"
        fillRule="evenodd"
        d="M14 20.2a5.2 5.2 0 0 1 5.2-5.2h1.8V12H19.2A7.2 7.2 0 0 0 12 19.2 7.2 7.2 0 0 0 19.2 26.4h1.8v-2.9H19.2a5.2 5.2 0 0 1-5.2-5.3Zm11.8-7.1h1.8A7.2 7.2 0 0 1 34 20.2a7.2 7.2 0 0 1-7.2 7.1H25.2v2.9h1.8A10 10 0 0 0 37 20.2 10 10 0 0 0 27 10.1h-1.8v3Z"
      />
    </svg>
  )
}

function AcmeGlyph({ gradId }: { gradId: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="8" y1="8" x2="32" y2="34">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#312e81" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      <path
        fill="#fff"
        d="M12 28 20 11l8 17h-3.2l-1.2-3.2H16.4L15.2 28H12Zm8-10.8-2-5.4-2 5.4h4Z"
      />
    </svg>
  )
}

function DevRelGlyph({ gradId }: { gradId: string }) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="40" x2="40" y2="0">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill={`url(#${gradId})`} />
      <path
        fill="#fff"
        d="M13 14h3.6l4.4 6.2L25.4 14H29l-6.2 8.6 6.4 9H26l-4.6-6.6L16.6 32H13l6.3-8.8L13 14Z"
      />
    </svg>
  )
}

function InitialsGlyph({
  initials,
  accent,
}: {
  initials: string
  accent: string
}) {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="11" fill={accent} />
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

export default function OrganizationLogo({
  name,
  brand,
  size = 40,
}: OrganizationLogoProps) {
  const gradId = useId().replace(/:/g, '')
  const glyph = (() => {
    switch (brand.icon) {
      case 'openlink':
        return <OpenLinkGlyph gradId={gradId} />
      case 'acme':
        return <AcmeGlyph gradId={`${gradId}-acme`} />
      case 'devrel':
        return <DevRelGlyph gradId={`${gradId}-dev`} />
      default:
        return (
          <InitialsGlyph
            initials={organizationInitials(name)}
            accent={brand.accent}
          />
        )
    }
  })()

  return (
    <VStack width={size} height={size} hAlign="center" vAlign="center">
      {glyph}
    </VStack>
  )
}
