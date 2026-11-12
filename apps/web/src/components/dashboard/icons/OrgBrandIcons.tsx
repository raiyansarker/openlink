import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function OpenLinkOrgIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M9 12h6M10.5 9.5a4.25 4.25 0 1 1 0 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M13.5 9.5a4.25 4.25 0 1 1 0 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function AcmeOrgIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M6 9h12v9H6z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M9 9V7.5A2.5 2.5 0 0 1 11.5 5h1A2.5 2.5 0 0 1 15 7.5V9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9 13h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function DevRelOrgIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="9" cy="8.5" r="2.25" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="15.5" cy="9" r="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5.5 18.5c.8-2.4 2.7-3.75 5-3.75s4.2 1.35 5 3.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M13.2 17.5c.35-1.65 1.45-2.5 2.8-2.5 1.9 0 3.1 1.35 3.5 3.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
