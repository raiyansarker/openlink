import { useRef, useState, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Grid, GridSpan } from '@astryxdesign/core/Grid'
import { Button } from '@astryxdesign/core/Button'
import { Avatar } from '@astryxdesign/core/Avatar'
import { useWorkspaceDirectory } from '#/contexts/WorkspaceDirectoryContext'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import { SquareImage } from '#/lib/media/square-image'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import { slugifyOrganizationSlug } from '#/lib/organization/slugify'

const ICON_MAX_BYTES = SquareImage.MAX_UPLOAD_BYTES
const ICON_ACCEPT = SquareImage.ACCEPT
const PICTURE_HELP = 'PNG, JPG, WebP, or GIF up to 10 MB. We crop it to a square.'
const SLUG_PLACEHOLDER = 'acme-inc'

function MutedCaption({ children }: { children: ReactNode }) {
  return (
    <Text type="supporting" color="secondary">
      {children}
    </Text>
  )
}

function PictureHelpCaption({ children }: { children: ReactNode }) {
  return (
    <Text
      type="supporting"
      color="secondary"
      style={{ fontSize: 11, lineHeight: 1.45, width: '100%' }}
    >
      {children}
    </Text>
  )
}

function FormBlock({
  title,
  description,
  children,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
}) {
  return (
    <VStack gap={2} hAlign="stretch" width="100%">
      <VStack gap={0.5} hAlign="start" width="100%">
        <Heading level={4} weight="bold">
          {title}
        </Heading>
        {description ? <MutedCaption>{description}</MutedCaption> : null}
      </VStack>
      {children}
    </VStack>
  )
}

type CreateOrganizationFormProps = {
  /** `onboarding` is the first workspace after sign-up: different copy and no way back. */
  variant?: 'create' | 'onboarding'
}

export default function CreateOrganizationForm({ variant = 'create' }: CreateOrganizationFormProps) {
  const isOnboarding = variant === 'onboarding'
  const { createOrganization } = useWorkspaceDirectory()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingIconFile = useRef<File | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const displayName = name.trim() || 'Organization'
  const slugPathSegment = slug.trim() || SLUG_PLACEHOLDER
  const slugDescription = `Your workspace URL: /w/${slugPathSegment}`

  const onNameChange = (value: string) => {
    setName(value)
    if (!slugEdited) {
      setSlug(slugifyOrganizationSlug(value))
    }
  }

  const onSlugChange = (value: string) => {
    setSlugEdited(true)
    setSlug(slugifyOrganizationSlug(value))
  }

  const openFilePicker = () => {
    setUploadError(null)
    fileRef.current?.click()
  }

  const onIconFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose a PNG, JPG, or GIF image.')
      return
    }
    if (file.size > ICON_MAX_BYTES) {
      setUploadError('That file is larger than 10 MB. Choose a smaller image.')
      return
    }
    setUploadError(null)
    pendingIconFile.current = file
    const url = URL.createObjectURL(file)
    setIconPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return url
    })
  }

  const removeIcon = () => {
    setUploadError(null)
    pendingIconFile.current = null
    setIconPreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSubmit = async () => {
    setFormError(null)
    setIsSubmitting(true)
    try {
      // Name, URL and logo go in one request: either the workspace exists with all of them, or not at all.
      const { organization: org } = await createOrganization({
        name,
        slug,
        logo: pendingIconFile.current,
      })
      ActiveWorkspace.remember(org.slug)
      void navigate({ to: WorkspaceUrl.build(org.slug), replace: true })
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not create organization.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <VStack gap={8} hAlign="stretch" width="100%">
        <VStack gap={1} hAlign="start" width="100%">
          <Heading level={3}>
            {isOnboarding ? 'Create your workspace' : 'Create organization'}
          </Heading>
          <Text color="secondary" type="supporting">
            {isOnboarding
              ? 'Your links, domains, and teammates live in a workspace. You can add more later.'
              : 'Add a workspace with its own links, members, and branding.'}
          </Text>
        </VStack>

        <FormBlock title="Icon">
          <HStack gap={4} vAlign="start" wrap="wrap" width="100%">
            <Avatar
              src={iconPreview ?? undefined}
              name={displayName}
              size={72}
              shape="rounded"
              tooltip={false}
            />
            <VStack gap={2} hAlign="start">
              <HStack gap={2} vAlign="center" wrap="wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  label="Upload"
                  onClick={openFilePicker}
                />
                {iconPreview ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Remove"
                    onClick={removeIcon}
                  />
                ) : null}
              </HStack>
              <PictureHelpCaption>{PICTURE_HELP}</PictureHelpCaption>
              {uploadError ? (
                <Text type="supporting" color="primary">
                  {uploadError}
                </Text>
              ) : null}
            </VStack>
          </HStack>
          <input
            ref={fileRef}
            type="file"
            accept={ICON_ACCEPT}
            tabIndex={-1}
            aria-hidden
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0,0,0,0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              onIconFile(file)
            }}
          />
        </FormBlock>

        <FormBlock
          title="Workspace"
          description="The name is shown across the dashboard. The slug appears in URLs."
        >
          <Grid columns={2} gap={4} width="100%">
            <GridSpan columns="full">
              <TextInput
                label="Organization name"
                width="100%"
                placeholder="Acme Inc."
                value={name}
                onChange={onNameChange}
                isRequired
              />
            </GridSpan>
            <GridSpan columns="full">
              <TextInput
                label="Slug"
                width="100%"
                placeholder={SLUG_PLACEHOLDER}
                value={slug}
                onChange={onSlugChange}
                description={slugDescription}
                isRequired
              />
            </GridSpan>
          </Grid>
        </FormBlock>

        {formError ? (
          <Text type="supporting" color="primary">
            {formError}
          </Text>
        ) : null}

        <HStack gap={2} vAlign="center" hAlign="end" wrap="wrap" width="100%">
          {isOnboarding ? null : (
            <Button
              variant="ghost"
              size="sm"
              label="Cancel"
              onClick={() => void navigate({ to: '/w' })}
            />
          )}
          <Button
            variant={isOnboarding ? 'primary' : 'secondary'}
            size="sm"
            label={isSubmitting ? 'Creating…' : isOnboarding ? 'Continue' : 'Create organization'}
            isDisabled={isSubmitting || !name.trim() || !slug.trim()}
            onClick={() => void handleSubmit()}
          />
        </HStack>
    </VStack>
  )
}
