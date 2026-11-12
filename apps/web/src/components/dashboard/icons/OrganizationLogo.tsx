import { useId } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import type { OrganizationBrand } from '#/data/demo/organization-branding'
import { organizationInitials } from '#/lib/dashboard/org-initials'

type OrganizationLogoProps = {
  name: string
  brand: OrganizationBrand
  size?: number
}

/** X (formerly Twitter) wordmark glyph */
function XGlyph() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#000" />
      <path
        fill="#fff"
        d="M22.1 18.4 29.3 10h-1.7l-6.2 7.2L16.3 10H10l7.6 11-7.6 9h1.7l6.6-7.7 5.3 7.7H29L22 18.4Zm-2.3 2.7-.8-1.1-6-8.6h2.6l5 7.1.8 1.1 6.2 8.9H25l-5.2-7.4Z"
      />
    </svg>
  )
}

/** GitHub octocat-style glyph */
function GitHubGlyph() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#24292e" />
      <path
        fill="#fff"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M20 9C13.925 9 9 13.925 9 20c0 4.862 3.157 8.978 7.526 10.433.55.102.75-.238.75-.529 0-.26-.01-1.126-.014-2.054-3.06.665-3.706-1.475-3.706-1.475-.5-1.27-1.223-1.608-1.223-1.608-1-.683.075-.669.075-.669 1.106.078 1.69 1.136 1.69 1.136.983 1.685 2.578 1.198 3.207.916.1-.712.385-1.198.7-1.473-2.444-.278-5.012-1.222-5.012-5.44 0-1.202.43-2.185 1.133-2.955-.113-.277-.49-1.397.108-2.912 0 0 .924-.296 3.025 1.127A10.52 10.52 0 0 1 20 13.455c.935.004 1.877.126 2.756.37 2.1-1.423 3.022-1.127 3.022-1.127.6 1.515.222 2.635.11 2.912.705.77 1.13 1.753 1.13 2.955 0 4.228-2.572 5.159-5.023 5.43.395.34.747 1.012.747 2.04 0 1.473-.013 2.661-.013 3.022 0 .294.197.637.754.529C27.845 28.975 31 24.86 31 20c0-6.075-4.925-11-11-11Z"
      />
    </svg>
  )
}

/** Dribbble ball glyph */
function DribbbleGlyph() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#ea4c89" />
      <circle cx="20" cy="20" r="10" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path
        d="M12.3 15.5A8.4 8.4 0 0 1 17 11.3M12.5 25a8.4 8.4 0 0 0 8.3-5.2c1.4.1 3 .3 4.4.7M27.7 15a8.4 8.4 0 0 1 .8 5.5M20.3 11.1A18 18 0 0 1 24.6 20M20 28.5a8.4 8.4 0 0 1-7.5-3.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
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
      <rect width="40" height="40" rx="10" fill={accent} />
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
      case 'x':
        return <XGlyph />
      case 'github':
        return <GitHubGlyph />
      case 'dribbble':
        return <DribbbleGlyph />
      default:
        return (
          <InitialsGlyph
            initials={organizationInitials(name)}
            accent={brand.accent}
          />
        )
    }
  })()

  void gradId // suppress unused warning

  return (
    <VStack width={size} height={size} hAlign="center" vAlign="center">
      {glyph}
    </VStack>
  )
}
