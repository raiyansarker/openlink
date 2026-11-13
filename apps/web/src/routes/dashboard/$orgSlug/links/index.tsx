import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Section } from '@astryxdesign/core/Section'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import CreateLinkChromeButton from '#/components/dashboard/CreateLinkChromeButton'
import LinksBrowser from '#/components/links/LinksBrowser'
import { createPageHead } from '#/lib/page-title'

export const Route = createFileRoute('/dashboard/$orgSlug/links/')({
  head: createPageHead('Links'),
  validateSearch: (search: Record<string, unknown>): { folder?: string } => ({
    folder:
      typeof search.folder === 'string' && search.folder
        ? search.folder
        : undefined,
  }),
  component: DashboardLinksPage,
})

function DashboardLinksPage() {
  const { folder } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  return (
    <Section padding={6}>
      <VStack gap={4}>
        <HStack hAlign="between" vAlign="start" gap={4} wrap="wrap" width="100%">
          <VStack gap={1}>
            <Heading level={2}>Links</Heading>
            <Text color="secondary">Organize short links into folders.</Text>
          </VStack>
          {/* Creates in the folder you're viewing. */}
          <CreateLinkChromeButton layout="hug" folderId={folder ?? null} />
        </HStack>
        <LinksBrowser
          folderId={folder}
          onOpenFolder={(id) =>
            navigate({ search: { folder: id ?? undefined } })
          }
        />
      </VStack>
    </Section>
  )
}
