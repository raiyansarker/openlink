import type { ReactNode } from 'react'

type DashboardContentFrameProps = {
  orgId: string
  children: ReactNode
}

export default function DashboardContentFrame({
  orgId,
  children,
}: DashboardContentFrameProps) {
  return (
    <div
      key={orgId}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)',
        minHeight: '100%',
      }}
    >
      {children}
    </div>
  )
}
