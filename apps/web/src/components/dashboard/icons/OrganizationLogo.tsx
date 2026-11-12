import type { OrganizationBrandIconKey } from '#/data/demo/organization-branding'

type OrganizationLogoProps = {
  icon: OrganizationBrandIconKey
  size?: number
}

function OpenLinkMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
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

function AcmeMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#4f46e5" />
      <path
        d="M11 22 16 9l5 13h-2.6l-.9-2.5h-3.1l-.9 2.5H11Zm5-7.5-1.1-3.1-1.1 3.1h2.2Z"
        fill="#fff"
      />
    </svg>
  )
}

function DevRelMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0d9488" />
      <path
        d="M11 11.5h10v2H11v-2Zm0 4h10v2H11v-2Zm0 4h7v2h-7v-2Z"
        fill="#fff"
      />
    </svg>
  )
}

function FallbackMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-background-muted)" />
      <circle cx="16" cy="16" r="6" fill="var(--openlink-brand)" />
    </svg>
  )
}

export default function OrganizationLogo({
  icon,
  size = 32,
}: OrganizationLogoProps) {
  switch (icon) {
    case 'openlink':
      return <OpenLinkMark size={size} />
    case 'acme':
      return <AcmeMark size={size} />
    case 'devrel':
      return <DevRelMark size={size} />
    default:
      return <FallbackMark size={size} />
  }
}
