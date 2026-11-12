import type { ReactNode } from 'react'

type ThreeColumnDashboardLayoutProps = {
  rail: ReactNode
  navigation: ReactNode
  detail: ReactNode
}

export default function ThreeColumnDashboardLayout({
  rail,
  navigation,
  detail,
}: ThreeColumnDashboardLayoutProps) {
  return (
    <div className="openlink-dashboard">
      {rail}
      {navigation}
      {detail}
    </div>
  )
}
