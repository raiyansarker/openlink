import { useEffect, useRef, useState } from 'react'
import { AspectRatio } from '@astryxdesign/core/AspectRatio'
import { Button } from '@astryxdesign/core/Button'
import { Card } from '@astryxdesign/core/Card'
import { Center } from '@astryxdesign/core/Center'
import { FileInput } from '@astryxdesign/core/FileInput'
import { HStack } from '@astryxdesign/core/HStack'
import { Spinner } from '@astryxdesign/core/Spinner'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

/** Open Graph cards are 1.91:1 (1200 × 630). */
const CARD_RATIO = 1200 / 630

type PreviewImageFieldProps = {
  /** The saved image (our media path or a public URL); empty when none. */
  imageUrl: string
  isUploading: boolean
  error: string | null
  accept: string
  maxBytes: number
  /** A file to upload. */
  onChoose: (file: File) => void
  onRemove: () => void
}

/**
 * The share-card image: a dropzone while empty; once set, the image at card
 * proportions with Replace and Remove. While a new file uploads, its local
 * copy shows under a spinner, so the card never goes blank.
 */
export default function PreviewImageField({
  imageUrl,
  isUploading,
  error,
  accept,
  maxBytes,
  onChoose,
  onRemove,
}: PreviewImageFieldProps) {
  const replaceInput = useRef<HTMLInputElement>(null)
  const [localUrl, setLocalUrl] = useState<string | null>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  // Drop the local copy once the uploaded image is in place (or the upload failed).
  useEffect(() => {
    if (!isUploading && localUrl) {
      URL.revokeObjectURL(localUrl)
      setLocalUrl(null)
    }
  }, [isUploading, localUrl])

  const choose = (file: File | null) => {
    if (!file) return
    setLocalUrl(URL.createObjectURL(file))
    setSize(null)
    onChoose(file)
  }

  const shown = localUrl ?? imageUrl
  const status = error ? { type: 'error' as const, message: error } : undefined

  if (!shown) {
    return (
      <FileInput
        label="Image"
        mode="dropzone"
        accept={accept}
        maxSize={maxBytes}
        description="PNG, JPG, WebP or GIF up to 5 MB. 1200 × 630 px looks best everywhere."
        placeholder="Drop an image here, or click to browse"
        value={null}
        onChange={(files) => choose(Array.isArray(files) ? (files[0] ?? null) : files)}
        status={status}
        isOptional
        width="100%"
      />
    )
  }

  const isSmall = size != null && (size.width < 600 || size.height < 315)

  return (
    <VStack gap={2} hAlign="stretch" width="100%">
      <Text weight="semibold" type="supporting">
        Image
      </Text>
      <Card padding={0} style={{ overflow: 'hidden', position: 'relative' }}>
        <AspectRatio ratio={CARD_RATIO}>
          <img
            src={shown}
            alt="Share image"
            onLoad={(event) => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              opacity: isUploading ? 0.55 : 1,
              transition: 'opacity 160ms ease',
            }}
          />
        </AspectRatio>
        {isUploading ? (
          <Center height="100%" style={{ position: 'absolute', inset: 0 }}>
            <Spinner size="md" label="Uploading image" />
          </Center>
        ) : null}
      </Card>
      <HStack gap={2} hAlign="between" vAlign="center" width="100%" wrap="wrap">
        <Text
          type="supporting"
          color="secondary"
          role={error ? 'alert' : undefined}
          style={error ? { color: 'var(--color-text-error)' } : undefined}
        >
          {error ??
            (isUploading
              ? 'Uploading…'
              : size
                ? `${size.width} × ${size.height} px${isSmall ? ' · may look blurry, 1200 × 630 is best' : ''}`
                : 'Shown when the link is shared.')}
        </Text>
        <HStack gap={2} vAlign="center">
          <Button
            variant="secondary"
            size="sm"
            label="Replace"
            isDisabled={isUploading}
            onClick={() => replaceInput.current?.click()}
          />
          <Button variant="ghost" size="sm" label="Remove" isDisabled={isUploading} onClick={onRemove} />
        </HStack>
      </HStack>
      {/* Replace reuses the browser's picker; the dropzone is only for the empty state. */}
      <input
        ref={replaceInput}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          choose(event.currentTarget.files?.[0] ?? null)
          event.currentTarget.value = ''
        }}
      />
    </VStack>
  )
}
