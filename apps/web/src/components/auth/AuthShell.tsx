import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@astryxdesign/core/Button'
import { Center } from '@astryxdesign/core/Center'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import OpenLinkAppMark from '#/components/dashboard/icons/OpenLinkAppMark'

type AuthShellProps = {
  heading: string
  subheading: string
  /** The other page: "Sign up" on sign-in, "Log in" on sign-up. Left out on pages for signed-in people. */
  switchTo?: { prompt: string; label: string; to: '/login' | '/signup'; redirect?: string }
  /** Optional artwork shown above the heading (status pages). */
  illustration?: ReactNode
  children: ReactNode
}

/**
 * The frame for both auth pages: a top bar with the wordmark and a visible
 * switch to the other page, then the form centered on the page with nothing
 * around it (the Astryx `login` template).
 */
export default function AuthShell({ heading, subheading, switchTo, illustration, children }: AuthShellProps) {
  const navigate = useNavigate()
  const search = switchTo?.redirect ? { redirect: switchTo.redirect } : {}
  const href = switchTo ? (switchTo.redirect ? `${switchTo.to}?redirect=${encodeURIComponent(switchTo.redirect)}` : switchTo.to) : ''
  return (
    <VStack
      as="main"
      gap={0}
      hAlign="stretch"
      width="100%"
      style={{ minHeight: '100dvh', backgroundColor: 'var(--color-background-body)' }}
    >
      <HStack as="header" hAlign="between" vAlign="center" gap={4} paddingInline={6} paddingBlock={5} width="100%">
        <HStack gap={2} vAlign="center">
          <OpenLinkAppMark size={28} />
          <Text weight="semibold" size="lg" style={{ letterSpacing: '-0.045em' }}>
            OpenLink
          </Text>
        </HStack>
        {switchTo ? (
          <HStack gap={3} vAlign="center">
            <Text type="supporting" color="secondary">
              {switchTo.prompt}
            </Text>
            <Button
              variant="secondary"
              size="sm"
              label={switchTo.label}
              href={href}
              onClick={(event) => {
                // A real link (new tab, copy), but plain clicks stay in the app.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                void navigate({ to: switchTo.to, search })
              }}
            />
          </HStack>
        ) : null}
      </HStack>

      <Center axis="both" padding={6} style={{ flex: 1 }}>
        <VStack gap={4} hAlign="stretch" style={{ width: '100%', maxWidth: 400 }}>
          {/* Straight on the page, no card around it. */}
          <VStack gap={6} hAlign="stretch">
            {illustration ? <Center>{illustration}</Center> : null}
            <VStack gap={1} hAlign="center">
              <Heading level={1} style={{ fontSize: 'var(--font-size-2xl)', letterSpacing: '-0.035em' }}>
                {heading}
              </Heading>
              <Text color="secondary" size="sm" justify="center">
                {subheading}
              </Text>
            </VStack>
            {children}
          </VStack>
        </VStack>
      </Center>
    </VStack>
  )
}
