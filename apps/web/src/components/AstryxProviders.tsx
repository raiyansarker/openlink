import { Link } from '@tanstack/react-router'
import { Theme } from '@astryxdesign/core/theme'
import { LinkProvider } from '@astryxdesign/core/Link'
import { neutralTheme } from '@astryxdesign/theme-neutral/built'
import type { ComponentProps, ReactNode } from 'react'

/** Bridges TanStack Router links to Astryx components that pass `href`. */
function RouterLink({
  href,
  to,
  children,
  className,
  style,
  ...rest
}: ComponentProps<typeof Link> & { href?: string }) {
  const destination = to ?? href ?? '/'
  return (
    <Link to={destination} className={className} style={style} {...rest}>
      {children}
    </Link>
  )
}

export default function AstryxProviders({ children }: { children: ReactNode }) {
  return (
    <Theme theme={neutralTheme} mode="system">
      <LinkProvider component={RouterLink}>{children}</LinkProvider>
    </Theme>
  )
}
