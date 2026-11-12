import { Icon } from '@astryxdesign/core/Icon'
import type { OrganizationBrandIconKey } from '#/data/demo/organization-branding'
import { getOrganizationBrand } from '#/data/demo/organization-branding'

type OrganizationLogoProps = {
  orgId: string
  icon: OrganizationBrandIconKey
  size?: number
}

function OpenLinkGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--openlink-brand)" />
      <path
        d="M10 16.5c0-2.8 2.2-5 5-5h2.2V9H15c-4.1 0-7.5 3.4-7.5 7.5S10.9 24 15 24h2.2v-2.5H15c-2.8 0-5-2.2-5-5Z"
        fill="#ffffff"
      />
      <path
        d="M17 11.5h2.2c2.8 0 5 2.2 5 5s-2.2 5-5 5H17V24h2.2c4.1 0 7.5-3.4 7.5-7.5S23.3 9 19.2 9H17v2.5Z"
        fill="#ffffff"
      />
    </svg>
  )
}

function AcmeGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <path
        d="M11 22 16 9l5 13h-2.6l-.9-2.5h-3.1l-.9 2.5H11Zm5-7.5-1.1-3.1-1.1 3.1h2.2Z"
        fill="#fff"
      />
    </svg>
  )
}

function DevRelGlyph() {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0d9488" />
      <path
        d="M9 12h14v3H9v-3Zm0 5h14v3H9v-3Zm0 5h10v3H9v-3Z"
        fill="#fff"
      />
      <circle cx="23" cy="21" r="3" fill="#fbbf24" />
    </svg>
  )
}

function FallbackGlyph({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-background-muted)" />
      <circle cx="16" cy="16" r="8" fill={accent} />
    </svg>
  )
}

function glyphFor(icon: OrganizationBrandIconKey, orgId: string) {
  switch (icon) {
    case 'openlink':
      return OpenLinkGlyph
    case 'acme':
      return AcmeGlyph
    case 'devrel':
      return DevRelGlyph
    default:
      return () => <FallbackGlyph accent={getOrganizationBrand(orgId).accent} />
  }
}

export default function OrganizationLogo({
  orgId,
  icon,
  size = 32,
}: OrganizationLogoProps) {
  const Glyph = glyphFor(icon, orgId)
  return (
    <Icon
      icon={Glyph}
      size="lg"
      label=""
      style={{ width: size, height: size }}
    />
  )
}
