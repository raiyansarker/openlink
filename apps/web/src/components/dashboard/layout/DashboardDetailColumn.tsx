import type { ReactNode } from 'react'

type DashboardDetailColumnProps = {
  orgId: string
  children: ReactNode
}

export default function DashboardDetailColumn({
  orgId,
  children,
}: DashboardDetailColumnProps) {
  return (
    <main className="openlink-dashboard__detail" key={orgId}>
      {children}
    </main>
  )
}
