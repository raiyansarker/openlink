import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useForm } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { type } from 'arktype'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Grid, GridSpan } from '@astryxdesign/core/Grid'
import { Button } from '@astryxdesign/core/Button'
import { Avatar } from '@astryxdesign/core/Avatar'
import { useWorkspaceDirectory } from '#/contexts/WorkspaceDirectoryContext'
import { api } from '#/lib/api/orpc'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import { SquareImage } from '#/lib/media/square-image'
import { ActiveWorkspace } from '#/lib/dashboard/org-slug'
import { checkedText, fieldStatus, firstError, requiredText, submitWith } from '#/lib/forms/fields'
import { isValidOrganizationSlug, slugifyOrganizationSlug } from '#/lib/organization/slugify'

const ICON_MAX_BYTES = SquareImage.MAX_UPLOAD_BYTES
const ICON_ACCEPT = SquareImage.ACCEPT
const PICTURE_HELP = 'PNG, JPG, WebP, or GIF up to 10 MB. We crop it to a square.'
const SLUG_PLACEHOLDER = 'acme-inc'

const CreateOrganizationSchema = type({
  name: requiredText('Enter a workspace name.'),
  slug: checkedText((slug) =>
    isValidOrganizationSlug(slug) ? null : 'Use a slug with lowercase letters, numbers, and hyphens (min. 2 characters).',
  ),
})

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

/** How long the name must stop changing before a free URL is looked up for it. */
const SUGGEST_DELAY_MS = 300

/** A URL for `name` that is free right now (`raiyans-workspace`, or with a suffix); null if the lookup fails. */
async function suggestSlug(name: string): Promise<string | null> {
  try {
    return (await api.organizations.suggestOrganizationSlug({ query: { name } })).slug
  } catch {
    return null
  }
}

type CreateOrganizationFormProps = {
  /** `onboarding` is the first workspace after sign-up: different copy and no way back. */
  variant?: 'create' | 'onboarding'
  /** The starting name; onboarding passes one made from the person's name ("Raiyan's workspace"). */
  defaultName?: string
}

export default function CreateOrganizationForm({ variant = 'create', defaultName = '' }: CreateOrganizationFormProps) {
  const isOnboarding = variant === 'onboarding'
  const { createOrganization } = useWorkspaceDirectory()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingIconFile = useRef<File | null>(null)

  // Once you type your own URL, the name stops filling it in. Nothing on screen depends on it.
  const slugEdited = useRef(false)
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  /** The name to look up a free URL for; follows the name field until the URL is edited by hand. */
  const [suggestFor, setSuggestFor] = useState(defaultName.trim())

  const form = useForm({
    defaultValues: { name: defaultName, slug: slugifyOrganizationSlug(defaultName) },
    validators: {
      onSubmit: CreateOrganizationSchema,
      onSubmitAsync: async ({ value }) => {
        try {
          // Name, URL and logo go in one request: the workspace exists with all of them, or not at all.
          const create = (slug: string) => createOrganization({ name: value.name, slug, logo: pendingIconFile.current })
          let created
          try {
            created = await create(value.slug)
          } catch (error) {
            // A URL we suggested was taken in the meantime: pick another free one and go on.
            // A URL typed by hand is the person's choice, so that error is shown instead.
            const fresh = !slugEdited.current && error instanceof Error && error.message.includes('already taken') ? await suggestSlug(value.name) : null
            if (!fresh || fresh === value.slug) throw error
            form.setFieldValue('slug', fresh)
            created = await create(fresh)
          }
          const { organization: org } = created
          ActiveWorkspace.remember(org.slug)
          void navigate({ to: WorkspaceUrl.build(org.slug), replace: true })
          return undefined
        } catch (error) {
          return error instanceof Error ? error.message : 'Could not create organization.'
        }
      },
    },
  })

  // Free the previous preview when it is replaced, removed or the form goes away.
  useEffect(() => {
    if (!iconPreview) return
    return () => URL.revokeObjectURL(iconPreview)
  }, [iconPreview])

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
    setIconPreview(URL.createObjectURL(file))
  }

  const removeIcon = () => {
    setUploadError(null)
    pendingIconFile.current = null
    setIconPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // Prefill a URL that is actually free, so nobody has to hunt for one. The field shows the
  // plain slug at once and is replaced by the free one when the lookup returns.
  useEffect(() => {
    if (!suggestFor || slugEdited.current) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void suggestSlug(suggestFor).then((slug) => {
        if (!cancelled && slug && !slugEdited.current) form.setFieldValue('slug', slug)
      })
    }, SUGGEST_DELAY_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestFor])

  return (
    <form noValidate onSubmit={submitWith(form)}>
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
          <HStack gap={4} vAlign="start" width="100%">
            <form.Subscribe selector={(state) => state.values.name.trim() || 'Organization'}>
              {(displayName) => (
                <Avatar
                  src={iconPreview ?? undefined}
                  name={displayName}
                  size={72}
                  shape="rounded"
                  tooltip={false}
                />
              )}
            </form.Subscribe>
            {/* Grows beside the icon, so the help text wraps next to it rather than below. */}
            <VStack gap={2} hAlign="start" style={{ flex: 1, minWidth: 0 }}>
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
              <form.Field name="name">
                {(field) => (
                  <TextInput
                    label="Organization name"
                    width="100%"
                    placeholder="Acme Inc."
                    value={field.state.value}
                    onChange={(value) => {
                      field.handleChange(value)
                      // The slug follows the name until it is edited by hand.
                      if (!slugEdited.current) {
                        form.setFieldValue('slug', slugifyOrganizationSlug(value))
                        setSuggestFor(value.trim())
                      }
                    }}
                    status={fieldStatus(field.state.meta.errors)}
                    isRequired
                  />
                )}
              </form.Field>
            </GridSpan>
            <GridSpan columns="full">
              <form.Field name="slug">
                {(field) => (
                  <TextInput
                    label="Slug"
                    width="100%"
                    placeholder={SLUG_PLACEHOLDER}
                    value={field.state.value}
                    onChange={(value) => {
                      slugEdited.current = true
                      field.handleChange(slugifyOrganizationSlug(value))
                    }}
                    description={`Your workspace URL: /w/${field.state.value.trim() || SLUG_PLACEHOLDER}`}
                    status={fieldStatus(field.state.meta.errors)}
                    isRequired
                  />
                )}
              </form.Field>
            </GridSpan>
          </Grid>
        </FormBlock>

        <form.Subscribe selector={(state) => firstError(state.errorMap.onSubmit ? [state.errorMap.onSubmit] : [])}>
          {(formError) =>
            formError ? (
              <Text type="supporting" color="primary" role="alert">
                {formError}
              </Text>
            ) : null
          }
        </form.Subscribe>

        <HStack gap={2} vAlign="center" hAlign="end" wrap="wrap" width="100%">
          {isOnboarding ? null : (
            <Button
              variant="ghost"
              size="sm"
              label="Cancel"
              onClick={() => void navigate({ to: '/w' })}
            />
          )}
          <form.Subscribe selector={(state) => [state.isSubmitting, state.values.name.trim() !== '' && state.values.slug.trim() !== ''] as const}>
            {([isSubmitting, isFilled]) => (
              <Button
                variant={isOnboarding ? 'primary' : 'secondary'}
                size="sm"
                type="submit"
                label={isSubmitting ? 'Creating…' : isOnboarding ? 'Continue' : 'Create organization'}
                isDisabled={isSubmitting || !isFilled}
              />
            )}
          </form.Subscribe>
        </HStack>
    </VStack>
    </form>
  )
}
