import { useEffect, useState } from 'react'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { FOLDER_BLUE } from '#/components/links/folder-colors'

type SocialPreviewCardProps = {
  host: string
  title: string
  description: string
  imageUrl: string
}

/** Mock of how the link unfurls on X, Slack, LinkedIn, iMessage… */
export default function SocialPreviewCard({
  host,
  title,
  description,
  imageUrl,
}: SocialPreviewCardProps) {
  const [imageFailed, setImageFailed] = useState(false)
  useEffect(() => setImageFailed(false), [imageUrl])
  const showImage = imageUrl && !imageFailed

  return (
    <VStack
      gap={0}
      hAlign="stretch"
      width="100%"
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--color-border-emphasized)',
        background: 'var(--color-background-surface)',
      }}
    >
      <div
        style={{
          aspectRatio: '1.91 / 1',
          width: '100%',
          background: `color-mix(in oklab, ${FOLDER_BLUE} 12%, var(--color-background-muted))`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showImage ? (
          <img
            src={imageUrl}
            alt=""
            onError={() => setImageFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Text type="supporting" color="secondary">
            {imageFailed ? 'Image couldn’t be loaded' : '1200 × 630 image'}
          </Text>
        )}
      </div>
      <VStack gap={1} hAlign="stretch" style={{ padding: '14px 16px' }}>
        <Text type="supporting" color="secondary" maxLines={1}>
          {host}
        </Text>
        <Text weight="semibold" maxLines={2}>
          {title || 'Your link title'}
        </Text>
        {description ? (
          <Text type="supporting" color="secondary" maxLines={2}>
            {description}
          </Text>
        ) : null}
      </VStack>
    </VStack>
  )
}
