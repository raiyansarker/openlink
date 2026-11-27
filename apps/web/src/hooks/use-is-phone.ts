import { useMediaQuery } from '@astryxdesign/core/hooks'

/**
 * The phone breakpoint: ThreeColumnDashboardLayout swaps in the mobile shell
 * at the same width, so page-level responsive props key off this one query.
 */
export const PHONE_QUERY = '(max-width: 767px)'

export function useIsPhone() {
  return useMediaQuery(PHONE_QUERY)
}

/**
 * Astryx padding steps: 8 = 32px (desktop page inset), 4 = 16px (Apple's
 * screen margin on phones). Dashboard pages share this so their content
 * edges line up on mobile.
 */
export function usePageInsetSteps() {
  const isPhone = useIsPhone()
  return { inline: isPhone ? 4 : 8, block: isPhone ? 4 : 8 } as const
}
