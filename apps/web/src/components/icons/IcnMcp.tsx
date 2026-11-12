/**
 * Inline SVG icons sourced from iconmcp.com (outline style, 16-unit grid).
 * Each component accepts className / style so they inherit currentColor.
 */

type SvgProps = React.SVGProps<SVGSVGElement> & { size?: number }

const base = (size: number) =>
  ({
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }) as const

export function HomeIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M3.234 6.15 L6.734 3.286 C7.47 2.683 8.53 2.683 9.266 3.286 L12.766 6.15 C13.231 6.53 13.5 7.098 13.5 7.698 L13.5 11.5 C13.5 12.605 12.605 13.5 11.5 13.5 L4.5 13.5 C3.395 13.5 2.5 12.605 2.5 11.5 L2.5 7.698 C2.5 7.098 2.769 6.53 3.234 6.15 Z" />
      <path d="M6.25 13.5 L6.25 11.2 C6.25 10.537 6.787 10 7.45 10 L8.55 10 C9.213 10 9.75 10.537 9.75 11.2 L9.75 13.5" />
    </svg>
  )
}

export function LinkIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <g transform="rotate(-45 8 8)">
        <path d="M7 5.75 H4.75 A2.25 2.25 0 0 0 4.75 10.25 H7" />
        <path d="M9 5.75 H11.25 A2.25 2.25 0 0 1 11.25 10.25 H9" />
        <line x1="5.75" y1="8" x2="10.25" y2="8" />
      </g>
    </svg>
  )
}

export function BarChartIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2.25" y="8.5" width="2" height="5" rx="0.6" />
      <rect x="7" y="2.5" width="2" height="11" rx="0.6" />
      <rect x="11.75" y="5.5" width="2" height="8" rx="0.6" />
    </svg>
  )
}

export function UsersIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="6" cy="5.25" r="2.5" />
      <path d="M1.75 13.5 C2.25 11.25 3.9 9.75 6 9.75 C8.1 9.75 9.75 11.25 10.25 13.5" />
      <path d="M10.25 2.85 A2.5 2.5 0 0 1 10.25 7.65" />
      <path d="M11.75 10 C12.9 10.5 13.7 11.8 14 13.5" />
    </svg>
  )
}

export function SettingsIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6.663 3.269 L6.631 2.646 C6.611 2.246 6.93 1.91 7.33 1.91 L8.67 1.91 C9.07 1.91 9.389 2.246 9.369 2.646 L9.337 3.269 C9.324 3.532 9.459 3.779 9.686 3.911 L10.698 4.495 C10.926 4.626 11.208 4.619 11.428 4.476 L11.953 4.137 C12.289 3.92 12.739 4.028 12.939 4.375 L13.609 5.535 C13.809 5.882 13.678 6.326 13.322 6.508 L12.766 6.793 C12.532 6.912 12.385 7.153 12.385 7.416 L12.385 8.584 C12.385 8.847 12.532 9.088 12.766 9.207 L13.322 9.492 C13.678 9.674 13.809 10.118 13.609 10.465 L12.939 11.625 C12.739 11.972 12.289 12.08 11.953 11.863 L11.428 11.524 C11.208 11.381 10.926 11.374 10.698 11.505 L9.686 12.089 C9.459 12.221 9.324 12.468 9.337 12.731 L9.369 13.354 C9.389 13.754 9.07 14.09 8.67 14.09 L7.33 14.09 C6.93 14.09 6.611 13.754 6.631 13.354 L6.663 12.731 C6.676 12.468 6.541 12.221 6.314 12.089 L5.302 11.505 C5.074 11.374 4.792 11.381 4.572 11.524 L4.047 11.863 C3.711 12.08 3.261 11.972 3.061 11.625 L2.391 10.465 C2.191 10.118 2.322 9.674 2.678 9.492 L3.234 9.207 C3.468 9.088 3.615 8.847 3.615 8.584 L3.615 7.416 C3.615 7.153 3.468 6.912 3.234 6.793 L2.678 6.508 C2.322 6.326 2.191 5.882 2.391 5.535 L3.061 4.375 C3.261 4.028 3.711 3.92 4.047 4.137 L4.572 4.476 C4.792 4.619 5.074 4.626 5.302 4.495 L6.314 3.911 C6.541 3.779 6.676 3.532 6.663 3.269 Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  )
}

export function PlusIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="8" y1="2.75" x2="8" y2="13.25" />
      <line x1="2.75" y1="8" x2="13.25" y2="8" />
    </svg>
  )
}

export function AnalyticsIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2" y="2.75" width="12" height="10.5" rx="2" />
      <path d="M4.5 10.5 L7 7.5 L9 9.25 L11.5 5.75" />
    </svg>
  )
}

export function DashboardIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2.25" y="2.25" width="4.5" height="6.25" rx="2" />
      <rect x="9.25" y="2.25" width="4.5" height="2.75" rx="1" />
      <rect x="9.25" y="7.5" width="4.5" height="6.25" rx="2" />
      <rect x="2.25" y="11" width="4.5" height="2.75" rx="1" />
    </svg>
  )
}

export function ReportIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M5 2.25 H11 A2.75 2.75 0 0 1 13.75 5 V13 A1.25 1.25 0 0 1 12.5 14.25 H3.5 A1.25 1.25 0 0 1 2.25 13 V3.5 A1.25 1.25 0 0 1 3.5 2.25 H5 Z" />
      <path d="M5.25 2.25 V5.25 H8.25" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" />
      <line x1="4.5" y1="10.25" x2="9.5" y2="10.25" />
    </svg>
  )
}

export function GlobeIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="8" cy="8" r="5.75" />
      <ellipse cx="8" cy="8" rx="2.5" ry="5.75" />
      <line x1="2.25" y1="8" x2="13.75" y2="8" />
      <path d="M3.4 5.25 H12.6 M3.4 10.75 H12.6" />
    </svg>
  )
}

export function ActivityIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M2.75 11.25 L5.5 7.75 L8.25 9.75 L11.25 4.75 L13.25 6.5" />
      <circle cx="12" cy="4.25" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function BellIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6.25 2.5 A3.5 3.5 0 0 1 12.5 2.75 V7.25 C12.5 8 12.85 8.65 13.35 9.1 L13.75 9.45 V10.25 H2.25 V9.45 L2.65 9.1 C3.15 8.65 3.5 8 3.5 7.25 V4.5" />
      <path d="M6.5 10.25 V10.75 A1.5 1.5 0 0 0 9.5 10.75 V10.25" />
    </svg>
  )
}

/** iconmcp: user */
export function UserIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="8" cy="5" r="2.75" />
      <path d="M2.75 13.75 C3.3 11.15 5.4 9.5 8 9.5 C10.6 9.5 12.7 11.15 13.25 13.75" />
    </svg>
  )
}

/** iconmcp: timeline-view */
export function TimelineViewIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="2" />
      <line x1="2.25" y1="5.75" x2="13.75" y2="5.75" />
      <line x1="4.75" y1="8.25" x2="8.75" y2="8.25" />
      <line x1="7.25" y1="10.75" x2="11.25" y2="10.75" />
    </svg>
  )
}

/** iconmcp: day-and-night */
export function DayAndNightIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="6" cy="6" r="1.75" />
      <line x1="6" y1="2.125" x2="6" y2="1.625" />
      <line x1="2.125" y1="6" x2="1.625" y2="6" />
      <line x1="3.26" y1="3.26" x2="2.906" y2="2.906" />
      <path d="M13.5 11.5 A2.875 2.875 0 1 1 10 8 A2.5 2.5 0 0 0 13.5 11.5 Z" />
    </svg>
  )
}

/** iconmcp: at-sign */
export function AtSignIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="8" cy="8" r="2.5" />
      <path d="M10.5 8 V9 A1.75 1.75 0 0 0 14 9 V8 A6 6 0 1 0 11.6 12.8" />
    </svg>
  )
}

/** iconmcp: building */
export function BuildingIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="2" width="10" height="12" rx="2" />
      <path d="M5.75 5 H7 M9 5 H10.25 M5.75 8 H7 M9 8 H10.25" />
      <path d="M6.5 14 L6.5 11.8 C6.5 11.358 6.858 11 7.3 11 L8.7 11 C9.142 11 9.5 11.358 9.5 11.8 L9.5 14" />
    </svg>
  )
}

/** iconmcp: app-integration */
export function AppIntegrationIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="2.25" y="2.25" width="4.25" height="4.25" rx="1" />
      <rect x="2.25" y="9.5" width="4.25" height="4.25" rx="1" />
      <rect x="9.5" y="9.5" width="4.25" height="4.25" rx="1" />
      <path d="M11.625 1.875 Q11.625 4.375 14.125 4.375 Q11.625 4.375 11.625 6.875 Q11.625 4.375 9.125 4.375 Q11.625 4.375 11.625 1.875 Z" />
    </svg>
  )
}

/** iconmcp: code-window */
export function CodeWindowIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
      <line x1="1.75" y1="5.75" x2="14.25" y2="5.75" />
      <path d="M6.5 8 L5 9.5 L6.5 11" />
      <path d="M9.5 8 L11 9.5 L9.5 11" />
    </svg>
  )
}

/** iconmcp: circle-check (outline) */
export function CircleCheckIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.25 8.25 L7.25 10.25 L10.75 6.25" />
    </svg>
  )
}

/** iconmcp: circle-check (solid / filled) */
export function CircleCheckSolidIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      stroke="none"
      {...p}
    >
      <path
        fillRule="evenodd"
        d="M14 8 A6 6 0 0 1 2 8 A6 6 0 0 1 14 8 Z M7.042 10.611 L7.25 10.667 L7.458 10.611 L7.564 10.524 L11.064 6.524 L11.111 6.458 L11.167 6.25 L11.111 6.042 L10.958 5.889 L10.75 5.833 L10.542 5.889 L10.436 5.976 L7.23 9.64 L5.545 7.955 L5.458 7.889 L5.25 7.833 L5.042 7.889 L4.889 8.042 L4.833 8.25 L4.889 8.458 L4.955 8.545 L6.955 10.545 Z"
      />
    </svg>
  )
}

/** iconmcp: log-out */
export function LogOutIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M6.25 2.25 L4.75 2.25 C3.922 2.25 3.25 2.922 3.25 3.75 L3.25 12.25 C3.25 13.078 3.922 13.75 4.75 13.75 L6.25 13.75" />
      <line x1="6.75" y1="8" x2="13.5" y2="8" />
      <path d="M10.5 5 L13.5 8 L10.5 11" />
    </svg>
  )
}

/** iconmcp: exit-sign */
export function ExitSignIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="2" />
      <rect x="4" y="5.5" width="2.5" height="5" rx="0.6" />
      <line x1="9" y1="8" x2="12" y2="8" />
      <path d="M10.76 9.24 L12 8 L10.76 6.76" />
    </svg>
  )
}

/** iconmcp: laptop */
export function LaptopIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p} strokeWidth={0.833}>
      <rect x="3" y="3" width="10" height="7.25" rx="2" />
      <path d="M3 10.25 L2.184 11.882 C1.985 12.281 2.275 12.75 2.721 12.75 L13.279 12.75 C13.725 12.75 14.015 12.281 13.816 11.882 L13 10.25" />
    </svg>
  )
}

/** iconmcp: smartphone */
export function SmartphoneIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p} strokeWidth={0.833}>
      <rect x="4" y="1.75" width="8" height="12.5" rx="2" />
      <line x1="7" y1="11.75" x2="9" y2="11.75" />
    </svg>
  )
}

/** iconmcp: monitor */
export function MonitorIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p} strokeWidth={0.833}>
      <rect x="1.75" y="2.5" width="12.5" height="8.5" rx="2" />
      <line x1="8" y1="11" x2="8" y2="13.5" />
      <line x1="5.25" y1="13.5" x2="10.75" y2="13.5" />
    </svg>
  )
}

export function MoreHorizontalIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p} fill="currentColor" stroke="none">
      <circle cx="3.25" cy="8" r="0.75" />
      <circle cx="8" cy="8" r="0.75" />
      <circle cx="12.75" cy="8" r="0.75" />
    </svg>
  )
}

export function HelpIcon({ size = 16, ...p }: SvgProps) {
  return (
    <svg {...base(size)} {...p}>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M6.25 6.25 A2.25 2.25 0 0 1 10.75 6.75 C10.75 8 9 8.5 8.5 9.25 V9.75" />
      <circle cx="8.5" cy="11.5" r="0.65" fill="currentColor" stroke="none" />
    </svg>
  )
}
