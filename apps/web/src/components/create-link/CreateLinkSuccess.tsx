import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import {
  QrBlock,
  RuleList,
  ShortLinkSummary,
  type PreviewRule,
} from '#/components/create-link/LinkPreviewPanel'

type CreateLinkSuccessProps = {
  title: string
  shortUrl: string
  destination: string
  folderLabel: string
  rules: PreviewRule[]
  tags: string[]
  qrFileName: string
  onViewLinks: () => void
  onCreateAnother: () => void
}

/** Shown in place of the form right after a link is created. */
export default function CreateLinkSuccess({
  title,
  shortUrl,
  destination,
  folderLabel,
  rules,
  tags,
  qrFileName,
  onViewLinks,
  onCreateAnother,
}: CreateLinkSuccessProps) {
  return (
    <VStack gap={6} hAlign="stretch" width="100%" style={{ maxWidth: 560, margin: '0 auto' }}>
      <VStack gap={1}>
        <Heading level={1}>Your link is ready</Heading>
        <Text color="secondary">Saved to {folderLabel}. Share it anywhere.</Text>
      </VStack>

      <Card padding={6} width="100%">
        <VStack gap={8} hAlign="stretch" width="100%">
          <ShortLinkSummary title={title} shortUrl={shortUrl} destination={destination} />
          <HStack gap={2} width="100%">
            <Button
              variant="secondary"
              label="Open destination"
              href={destination}
              target="_blank"
              rel="noopener noreferrer"
            />
          </HStack>
          <QrBlock value={shortUrl} fileName={qrFileName} size={200} />
          {rules.length > 0 || tags.length > 0 ? (
            <RuleList rules={rules} tags={tags} />
          ) : null}
        </VStack>
      </Card>

      <HStack gap={2} hAlign="end" width="100%" wrap="wrap">
        <Button variant="ghost" label="Create another" onClick={onCreateAnother} />
        <Button variant="secondary" label="View in Links" onClick={onViewLinks} />
      </HStack>
    </VStack>
  )
}
