import { useRouterState } from '@tanstack/react-router'

export function useActivePathname(): string {
  return useRouterState({ select: (state) => state.location.pathname })
}
