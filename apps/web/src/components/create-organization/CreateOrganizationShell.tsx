import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { DASHBOARD_SURFACE_BG } from '#/components/dashboard/layout/dashboard-shell-colors'

/** Compact centered column for the create-organization form (~23–24rem). */
const CREATE_ORGANIZATION_FORM_MAX_WIDTH = '24rem'

type CreateOrganizationShellProps = {
  children: ReactNode
}

function ChevronBackIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 3.5 5.5 8 10 12.5" />
    </svg>
  )
}

export default function CreateOrganizationShell({
  children,
}: CreateOrganizationShellProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        minHeight: '100dvh',
        overflowY: 'auto',
        backgroundColor: DASHBOARD_SURFACE_BG,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          padding: '20px 12px 0 20px',
          zIndex: 1,
        }}
      >
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '2px 0',
            border: 'none',
            borderRadius: 0,
            cursor: 'pointer',
            backgroundColor: 'transparent',
            color: '#0a0a0a',
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'inherit',
            letterSpacing: '-0.02em',
            textDecoration: 'none',
          }}
        >
          <ChevronBackIcon />
          Dashboard
        </Link>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          boxSizing: 'border-box',
          padding: '64px 20px 48px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            width: '100%',
            maxWidth: CREATE_ORGANIZATION_FORM_MAX_WIDTH,
            margin: '0 auto',
            boxSizing: 'border-box',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
