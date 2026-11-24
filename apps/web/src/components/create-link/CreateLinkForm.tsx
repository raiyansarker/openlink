import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm, useStore } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { Banner } from '@astryxdesign/core/Banner'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import { Collapsible } from '@astryxdesign/core/Collapsible'
import { firstError } from '#/lib/forms/fields'
import { useShortcut } from '#/hooks/use-shortcut'
import { useMediaQuery } from '@astryxdesign/core/hooks'
import CreateLinkShell from '#/components/create-link/CreateLinkShell'
import { useOrganization } from '#/contexts/OrganizationContext'
import type { ShortLink } from '#/lib/api/types'
import { WorkspaceUrl } from '#/lib/dashboard/build-org-path'
import {
  emptyDraft,
  generateSlug,
  linkToDraft,
  validateDraft,
  type CreateLinkDraft,
  type DraftErrors,
} from '#/lib/links/create-link'
import {
  LinkFormContext,
  useLinkForm,
  PendingPreview,
  type LinkFormContextValue,
  type ValidateFn,
} from '#/components/create-link/form/LinkFormContext'
import {
  PreviewAside,
  SubmitActions,
} from '#/components/create-link/form/PreviewAside'
import {
  DestinationSection,
  DetailsSection,
  PasswordSection,
  ShortLinkSection,
} from '#/components/create-link/form/sections/CoreSections'
import {
  TargetingSection,
  UtmSection,
} from '#/components/create-link/form/sections/TargetingUtmSections'
import {
  DeliverySection,
  SocialPreviewSection,
} from '#/components/create-link/form/sections/SocialDeliverySections'
import {
  AdvancedSection,
  AvailabilitySection,
  HoldSection,
} from '#/components/create-link/form/sections/HoldAvailabilityAdvancedSections'

type CreateLinkFormProps = {
  initialFolderId: string | null
  /** When set, the form edits this link instead of creating one. */
  editLink?: ShortLink
}

/*
 * Rendering model
 *
 * `CreateLinkForm` owns the form instance and never subscribes to its values,
 * so typing doesn't re-render it. Every section and field below is memoized
 * and reads just the slice of the draft it shows (`useDraftValue` /
 * `useDraftSelect`), so a keystroke re-renders only the input being typed in
 * and the few pieces that display that value. The preview panel follows the
 * draft through `useDeferredValue`.
 */

const FormHeader = memo(function FormHeader({ editLink }: { editLink?: ShortLink }) {
  const { activeOrg, shortUrlFor } = useOrganization()
  // Stacked widths carry the title in the modal nav bar; only the
  // description stays here (Apple large-title pattern, inverted).
  const isStacked = useMediaQuery('(max-width: 959px)')
  return (
    <VStack gap={1}>
      {!isStacked ? (
        <Heading level={1}>{editLink ? 'Edit link' : 'Create link'}</Heading>
      ) : null}
      <Text color="secondary">
        {editLink
          ? `Changes apply to ${shortUrlFor(editLink.slug, editLink.domainId ?? null).replace(/^https?:\/\//, '')} as soon as you save.`
          : `Shorten a URL for ${activeOrg.name}, then decide who goes where.`}
      </Text>
    </VStack>
  )
})

const SubmitErrorBanner = memo(function SubmitErrorBanner() {
  const { form } = useLinkForm()
  const message = useStore(form.store, (state) => firstError(state.errors) ?? null)
  return message ? <Banner status="error" title={message} /> : null
})

/**
 * The sections are static elements: React skips them when the root re-renders.
 *
 * On stacked (phone/tablet) widths the form keeps the essentials —
 * destination, short link, password, details — and folds the seven optional
 * sections (targeting, tracking, social, delivery, hold, availability,
 * advanced) behind one "More options" disclosure, Apple-style progressive
 * disclosure. Desktop shows every section, as before.
 */
const FormBody = memo(function FormBody({ editLink }: { editLink?: ShortLink }) {
  const isStacked = useMediaQuery('(max-width: 959px)')
  const coreSections = (
    <>
      <DestinationSection />
      <ShortLinkSection />
      <PasswordSection />
      <DetailsSection />
    </>
  )
  const optionalSections = (
    <>
      <TargetingSection />
      <UtmSection />
      <SocialPreviewSection />
      <DeliverySection />
      <HoldSection />
      <AvailabilitySection />
      <AdvancedSection />
    </>
  )
  return (
    <VStack gap={8} hAlign="stretch" width="100%">
      <FormHeader editLink={editLink} />
      <SubmitErrorBanner />
      <VStack gap={0} hAlign="stretch" width="100%">
        {coreSections}
        {isStacked ? (
          <Collapsible defaultIsOpen={false} trigger="More options">
            {/* The gap between the disclosure and the first optional
                section (Targeting) needs to FEEL opened — a hairline gap
                reads like a rendering mistake, so this inner stack starts
                with real air. */}
            <VStack gap={0} hAlign="stretch" width="100%" style={{ paddingTop: 28 }}>
              {optionalSections}
            </VStack>
          </Collapsible>
        ) : (
          optionalSections
        )}
      </VStack>
    </VStack>
  )
})

export default function CreateLinkForm({
  initialFolderId,
  editLink,
}: CreateLinkFormProps) {
  const isEditing = editLink != null
  const hasSavedPassword = isEditing && !!editLink.passwordProtected
  const navigate = useNavigate()
  const { activeOrg, links, folders, createLink, updateLink } = useOrganization()

  const [created, setCreated] = useState<ShortLink | null>(null)
  const uploadingRef = useRef(false)
  const [pendingPreview] = useState(() => new PendingPreview())

  const editing = useMemo(
    () => (editLink ? { linkId: editLink.id, hasPassword: !!editLink.passwordProtected } : undefined),
    [editLink],
  )

  const goToDetail = (linkId: string) => {
    void navigate({
      to: '/w/$orgSlug/links/$linkId',
      params: { orgSlug: activeOrg.slug, linkId },
    })
  }

  // The whole draft is the form's value; fields write it through `set`.
  const form = useForm({
    defaultValues: editLink ? linkToDraft(editLink) : emptyDraft(initialFolderId),
    validators: {
      onSubmit: ({ value }) => {
        if (uploadingRef.current) return 'Wait for the preview image to finish uploading.'
        const fields = validateDraft(value, { links, editing })
        return Object.keys(fields).length > 0
          ? { form: 'Fix the highlighted fields to save the link.', fields }
          : undefined
      },
      onSubmitAsync: async ({ value }) => {
        try {
          if (editLink) {
            await updateLink(editLink.id, value)
          } else {
            const link = await createLink(value, value.previewEnabled ? pendingPreview.current : null)
            // The new link is now in `links`; stop validating so its own
            // back-half isn't flagged as taken while we navigate away.
            setCreated(link)
            goToDetail(link.id)
          }
          return undefined
        } catch (err) {
          return err instanceof Error ? err.message : 'Something went wrong.'
        }
      },
    },
    onSubmit: () => {
      if (editLink) goToDetail(editLink.id)
    },
  })

  const set = useCallback<LinkFormContextValue['set']>(
    (key, value) => form.setFieldValue(key, value as never),
    [form],
  )

  const patch = useCallback<LinkFormContextValue['patch']>(
    (change) => {
      const next = change(form.state.values)
      for (const key of Object.keys(next) as (keyof CreateLinkDraft)[]) {
        form.setFieldValue(key, next[key] as never)
      }
    },
    [form],
  )

  // One validation per draft change, shared by every field that shows an error.
  const validate = useMemo<ValidateFn>(() => {
    let lastValues: CreateLinkDraft | null = null
    let lastSubmitting = false
    let lastErrors: DraftErrors = {}
    return (values, isSubmitting) => {
      if (values === lastValues && isSubmitting === lastSubmitting) return lastErrors
      const found = validateDraft(values, { links, editing })
      // While saving (and until we navigate away) `links` already contains the
      // link being created, so its own back-half would be flagged as taken.
      if (!isEditing && (isSubmitting || created)) delete found.slug
      lastValues = values
      lastSubmitting = isSubmitting
      lastErrors = found
      return found
    }
  }, [links, editing, isEditing, created])

  // Suggest a random back-half after mount (not during SSR, to keep
  // hydration deterministic). An unknown ?folder= falls back to the top level.
  useEffect(() => {
    if (isEditing) return
    patch((prev) => ({
      slug: prev.slug || generateSlug(),
      folderId:
        prev.folderId && folders.some((f) => f.id === prev.folderId)
          ? prev.folderId
          : null,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = useCallback(() => {
    if (created || form.state.isSubmitting) return
    void form.handleSubmit()
  }, [created, form])

  // ⌘/Ctrl + Enter submits from anywhere on the page.
  useShortcut('Mod+Enter', submit, { allowInOverlays: true })

  const linksPath = WorkspaceUrl.build(activeOrg.slug, 'links')
  const onCancel = useCallback(() => {
    if (editLink) {
      goToDetail(editLink.id)
    } else {
      void navigate({
        to: linksPath,
        search: { folder: initialFolderId ?? undefined },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editLink, linksPath, initialFolderId, navigate])

  const context = useMemo<LinkFormContextValue>(
    () => ({ form, validate, isEditing, editingLinkId: editLink?.id, hasSavedPassword, uploadingRef, pendingPreview, set, patch }),
    [form, validate, isEditing, editLink?.id, hasSavedPassword, pendingPreview, set, patch],
  )

  return (
    <LinkFormContext.Provider value={context}>
      <CreateLinkShell
        title={editLink ? 'Edit link' : 'Create link'}
        backTo={editLink ? `/w/${activeOrg.slug}/links/${editLink.id}` : linksPath}
        backLabel={editLink ? editLink.title : 'Links'}
        backSearch={editLink ? undefined : { folder: initialFolderId ?? undefined }}
        main={<FormBody editLink={editLink} />}
        aside={<PreviewAside />}
        asideFooter={
          <SubmitActions isEditing={isEditing} onSubmit={submit} onCancel={onCancel} />
        }
      />
    </LinkFormContext.Provider>
  )
}
