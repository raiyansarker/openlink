import { memo, useCallback, useMemo, useState } from 'react'
import { Banner } from '@astryxdesign/core/Banner'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import FormSection, {
  OptionRow,
  WithCounter,
} from '#/components/create-link/FormSection'
import PreviewImageField from '#/components/create-link/PreviewImageField'
import { useFrameCheck } from '#/hooks/use-frame-check'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { RedirectStatus } from '#/lib/api/types'
import {
  MAX_PREVIEW_DESCRIPTION,
  MAX_PREVIEW_IMAGE_BYTES,
  MAX_PREVIEW_TITLE,
  normalizeUrl,
  PREVIEW_IMAGE_ACCEPT,
} from '#/lib/links/create-link'
import { DraftTextArea, DraftTextInput } from '#/components/create-link/form/fields'
import {
  useDraftSelect,
  useDraftValue,
  useFieldError,
  useLinkForm,
  usePendingPreviewUrl,
  useShortHost,
  useShortUrl,
} from '#/components/create-link/form/LinkFormContext'
import { hostOf, validDestination } from '#/components/create-link/form/derive'

const PreviewTitleField = memo(function PreviewTitleField() {
  const count = useDraftSelect((d) => d.previewTitle.trim().length)
  const placeholder = useDraftSelect(
    (d) => d.title.trim() || hostOf(normalizeUrl(d.destination)),
  )
  return (
    <WithCounter count={count} max={MAX_PREVIEW_TITLE}>
      <DraftTextInput
        field="previewTitle"
        label="Share title"
        placeholder={placeholder || 'Spring launch — 20% off everything'}
        isOptional
        width="100%"
      />
    </WithCounter>
  )
})

const PreviewDescriptionField = memo(function PreviewDescriptionField() {
  const count = useDraftSelect((d) => d.previewDescription.trim().length)
  return (
    <WithCounter count={count} max={MAX_PREVIEW_DESCRIPTION}>
      <DraftTextArea
        field="previewDescription"
        label="Share description"
        placeholder="A sentence or two that makes people want to click."
        rows={2}
        isOptional
        width="100%"
      />
    </WithCounter>
  )
})

/**
 * Owns the upload state, so an upload re-renders this field and nothing else. A new link keeps
 * the picked file and sends it with the create request; a saved link stores it at once (a PATCH
 * with only the image) and keeps the URL that comes back.
 */
const SocialImageField = memo(function SocialImageField() {
  const { set, uploadingRef, pendingPreview, editingLinkId: editingId } = useLinkForm()
  const { setLinkPreviewImage } = useOrganization()
  const savedUrl = useDraftValue('previewImage')
  const pendingUrl = usePendingPreviewUrl()
  const fieldError = useFieldError('previewImage')
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const onChoose = useCallback(
    (file: File | null) => {
      setFileError(null)
      if (!file) {
        pendingPreview.set(null)
        set('previewImage', '')
        return
      }
      if (!PREVIEW_IMAGE_ACCEPT.split(',').includes(file.type)) {
        setFileError('Use a PNG, JPG, WebP or GIF image.')
        return
      }
      if (file.size > MAX_PREVIEW_IMAGE_BYTES) {
        setFileError('Images must be 5 MB or smaller.')
        return
      }
      if (!editingId) {
        pendingPreview.set(file)
        set('previewImage', '')
        return
      }
      uploadingRef.current = true
      setIsUploading(true)
      setLinkPreviewImage(editingId, file)
        .then((link) => set('previewImage', link.socialPreview?.imageUrl ?? ''))
        .catch((err: unknown) => {
          setFileError(
            err instanceof Error ? err.message : 'The image could not be saved. Please try again.',
          )
        })
        .finally(() => {
          uploadingRef.current = false
          setIsUploading(false)
        })
    },
    [editingId, pendingPreview, set, setLinkPreviewImage, uploadingRef],
  )
  // Removing takes effect when the link is saved (the saved card drops its image).
  const onRemove = useCallback(() => onChoose(null), [onChoose])

  return (
    <PreviewImageField
      imageUrl={pendingUrl || savedUrl}
      isUploading={isUploading}
      error={fileError ?? fieldError ?? null}
      accept={PREVIEW_IMAGE_ACCEPT}
      maxBytes={MAX_PREVIEW_IMAGE_BYTES}
      onChoose={onChoose}
      onRemove={onRemove}
    />
  )
})

export const SocialPreviewSection = memo(function SocialPreviewSection() {
  const { set } = useLinkForm()
  const enabled = useDraftValue('previewEnabled')
  const toggle = useMemo(
    () => ({
      label: 'Customize social preview',
      value: enabled,
      onChange: (on: boolean) => set('previewEnabled', on),
    }),
    [enabled, set],
  )
  return (
    <FormSection
      title="Social preview"
      description="The title, description and image people see when the link is shared on X, Slack, LinkedIn or iMessage. Blank fields use the link’s title. See the live card in the preview panel."
      toggle={toggle}
    >
      <PreviewTitleField />
      <PreviewDescriptionField />
      <SocialImageField />
    </FormSection>
  )
})

const REDIRECT_OPTIONS: {
  value: RedirectStatus
  label: string
  help: string
}[] = [
  {
    value: 302,
    label: '302 · Temporary',
    help: 'Default. Browsers re-check every visit, so you can change the destination any time and every click is counted.',
  },
  {
    value: 301,
    label: '301 · Permanent',
    help: 'Best for SEO when the destination will never change. Browsers may cache it and skip the short link on repeat visits.',
  },
  {
    value: 307,
    label: '307',
    help: 'Temporary, and keeps the request method and body (e.g. form POSTs).',
  },
  {
    value: 308,
    label: '308',
    help: 'Permanent, and keeps the request method and body.',
  },
]

const RedirectType = memo(function RedirectType() {
  const { set } = useLinkForm()
  const redirectStatus = useDraftValue('redirectStatus')
  const cloakEnabled = useDraftValue('cloakEnabled')
  const onChange = useCallback(
    (value: string) => set('redirectStatus', Number(value) as RedirectStatus),
    [set],
  )
  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      <SegmentedControl
        label="Redirect type"
        value={String(redirectStatus)}
        onChange={onChange}
        layout="fill"
        isDisabled={cloakEnabled}
      >
        {REDIRECT_OPTIONS.map((option) => (
          <SegmentedControlItem
            key={option.value}
            value={String(option.value)}
            label={option.label}
          />
        ))}
      </SegmentedControl>
      <Text type="supporting" color="secondary">
        {cloakEnabled
          ? 'Redirect type isn’t used while link cloaking is on.'
          : REDIRECT_OPTIONS.find((o) => o.value === redirectStatus)?.help}
      </Text>
    </VStack>
  )
})

/** Plain-language "how it works" list used by the cloaking option. */
const HowItWorks = memo(function HowItWorks({ steps }: { steps: string[] }) {
  return (
    <VStack
      gap={2}
      hAlign="stretch"
      width="100%"
      style={{
        padding: 14,
        borderRadius: 10,
        background: 'var(--color-background-muted)',
      }}
    >
      <Text weight="semibold" type="supporting">
        How it works
      </Text>
      {steps.map((step, index) => (
        <HStack key={step} gap={3} vAlign="start" width="100%">
          <Text type="supporting" weight="semibold" style={{ minWidth: 14 }}>
            {index + 1}.
          </Text>
          <Text type="supporting" color="secondary">
            {step}
          </Text>
        </HStack>
      ))}
    </VStack>
  )
})

/**
 * Mounted only while cloaking is on, so the framing check (and its debounce
 * timer) don't run, or re-render the form, otherwise.
 */
const CloakDetails = memo(function CloakDetails() {
  const { activeOrg } = useOrganization()
  const shortHost = useShortHost()
  const shortUrl = useShortUrl()
  const destination = useDraftSelect(validDestination)
  const host = hostOf(destination)
  const frameCheck = useFrameCheck(activeOrg.id, destination, !!destination)
  const steps = useMemo(
    () => [
      `Someone opens ${shortUrl.replace(/^https?:\/\//, '')}.`,
      'Instead of redirecting, OpenLink serves a page that loads the destination full-screen inside it (an iframe).',
      `The address bar keeps showing ${shortHost}, and the social preview above is what gets shared.`,
      'Clicks on links inside the page stay in the frame; links that open new tabs show the real site.',
    ],
    [shortUrl, shortHost],
  )

  return (
    <>
      <HowItWorks steps={steps} />
      {frameCheck.frameable === false ? (
        <Banner
          status="warning"
          title={`${host || 'This site'} doesn’t allow being shown in a frame`}
          description="Visitors will be redirected to it normally, so the address bar shows the real URL."
        />
      ) : frameCheck.frameable === true ? (
        <Banner
          status="success"
          title={`${host} can be cloaked`}
          description="It allows being shown in a frame."
        />
      ) : (
        <Text type="supporting" color="secondary">
          {frameCheck.isChecking
            ? 'Checking whether the destination allows being framed…'
            : 'Sites that refuse to be framed (most banks, Google, social networks) are redirected normally instead.'}
        </Text>
      )}
    </>
  )
})

const CloakOption = memo(function CloakOption() {
  const { set } = useLinkForm()
  const enabled = useDraftValue('cloakEnabled')
  const shortHost = useShortHost()
  const toggle = useMemo(
    () => ({
      label: 'Cloak the destination',
      value: enabled,
      onChange: (on: boolean) => set('cloakEnabled', on),
    }),
    [enabled, set],
  )
  return (
    <OptionRow
      hasDivider
      title="Link cloaking"
      description={`Visitors keep seeing ${shortHost} in the address bar instead of the destination’s URL.`}
      toggle={toggle}
    >
      <CloakDetails />
    </OptionRow>
  )
})

export const DeliverySection = memo(function DeliverySection() {
  return (
    <FormSection title="Delivery" description="How visitors get to the destination.">
      <RedirectType />
      <CloakOption />
    </FormSection>
  )
})
