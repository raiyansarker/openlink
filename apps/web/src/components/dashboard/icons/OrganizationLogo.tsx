import { useId } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import type { OrganizationBrand } from '#/data/demo/organization-branding'
import { organizationInitials } from '#/lib/dashboard/org-initials'

type OrganizationLogoProps = {
  name: string
  brand: OrganizationBrand
  size?: number
}

/** GitLab tanuki (Simple Icons). */
const GITLAB_PATH =
  'm23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3362.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8633 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4619-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0094-7.003z'

/** Meta loop mark (Simple Icons). */
const META_PATH =
  'M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z'

function GitLabGlyph() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#FC6D26" />
      <svg x="5" y="5" width="30" height="30" viewBox="0 0 24 24">
        <path fill="#ffffff" d={GITLAB_PATH} />
      </svg>
    </svg>
  )
}

function MetaGlyph() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#ffffff" />
      <svg x="5" y="5" width="30" height="30" viewBox="0 0 24 24">
        <path fill="#0866FF" d={META_PATH} />
      </svg>
    </svg>
  )
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden>
      <rect width="40" height="40" rx="10" fill="#fff" />
      <path
        fill="#4285F4"
        d="M28.2 20.2c0-.8-.1-1.5-.2-2.2H20v4.2h4.6c-.2 1.1-.9 2.1-1.9 2.7v2.2h3.1c1.8-1.7 2.8-4.1 2.8-7Z"
      />
      <path
        fill="#34A853"
        d="M20 29c2.6 0 4.8-.9 6.4-2.4l-3.1-2.2c-.9.6-2 .9-3.3.9-2.5 0-4.7-1.7-5.5-4H11v2.3C12.6 27.4 16 29 20 29Z"
      />
      <path
        fill="#FBBC05"
        d="M14.5 21.3c-.2-.6-.3-1.2-.3-1.8s.1-1.3.3-1.8V15.4H11c-.7 1.4-1.1 3-1.1 4.6s.4 3.2 1.1 4.6l3.5-2.3Z"
      />
      <path
        fill="#EA4335"
        d="M20 14.5c1.4 0 2.6.5 3.6 1.4l2.7-2.7C24.8 11.5 22.6 10.5 20 10.5c-4 0-7.4 2.6-9 6.2l3.5 2.3c.8-2.3 3-3.8 5.5-3.8Z"
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
      case 'gitlab':
        return <GitLabGlyph />
      case 'meta':
        return <MetaGlyph />
      case 'google':
        return <GoogleGlyph />
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
