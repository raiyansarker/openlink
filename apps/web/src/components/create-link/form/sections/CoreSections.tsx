import { memo, useCallback, useMemo } from 'react'
import { MAX_LINK_NOTES_LENGTH } from '@openlink/contracts'
import { Button } from '@astryxdesign/core/Button'
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Tokenizer } from '@astryxdesign/core/Tokenizer'
import { createStaticSource } from '@astryxdesign/core/Typeahead'
import { VStack } from '@astryxdesign/core/VStack'
import PasswordField from '#/components/common/PasswordField'
import FormSection, { FieldRow } from '#/components/create-link/FormSection'
import FolderPicker from '#/components/links/FolderPicker'
import { useOrganization } from '#/contexts/OrganizationContext'
import { ShortUrl } from '#/lib/links/short-url'
import { generateSlug, MIN_PASSWORD_LENGTH, normalizeUrl } from '#/lib/links/create-link'
import { DraftTextArea, DraftTextInput } from '#/components/create-link/form/fields'
import {
  useDraftSelect,
  useDraftValue,
  useFieldStatus,
  useLinkForm,
  useShortUrl,
} from '#/components/create-link/form/LinkFormContext'
import { hostOf } from '#/components/create-link/form/derive'

const DEFAULT_DOMAIN_VALUE = '__default__'

export const DestinationSection = memo(function DestinationSection() {
  return (
    <FormSection
      title="Destination"
      description="Where people end up when they open the short link."
    >
      <DraftTextInput
        field="destination"
        type="url"
        label="Destination URL"
        placeholder="https://example.com/spring-launch"
        showFavicon
        hasAutoFocus
        isRequired
        width="100%"
      />
    </FormSection>
  )
})

/** Domain picker + back-half + generate. Re-renders as the back-half is typed, nothing else does. */
const ShortLinkInput = memo(function ShortLinkInput() {
  const { isEditing, set } = useLinkForm()
  const { domains } = useOrganization()
  const domainId = useDraftValue('domainId')
  const slug = useDraftValue('slug')
  const status = useFieldStatus('slug')
  const shortUrl = useShortUrl()

  const domainOptions = useMemo(
    () => [
      {
        value: DEFAULT_DOMAIN_VALUE,
        label: ShortUrl.appHost() || 'This app',
        description: 'Served by this app',
      },
      ...domains.map((d) => ({
        value: d.id,
        label: d.hostname,
        description:
          d.readiness === 'active'
            ? 'Custom domain'
            : 'Finish DNS setup to use this domain',
        disabled: d.readiness !== 'active',
      })),
    ],
    [domains],
  )

  const onDomainChange = useCallback(
    (value: string) => set('domainId', value === DEFAULT_DOMAIN_VALUE ? null : value),
    [set],
  )
  const onSlugChange = useCallback((value: string) => set('slug', value), [set])
  const onGenerate = useCallback(() => set('slug', generateSlug()), [set])

  return (
    <VStack gap={2} hAlign="stretch" width="100%">
      <InputGroup label="Short link" isLabelHidden status={status}>
        <Selector
          label="Domain"
          isLabelHidden
          options={domainOptions}
          value={domainId ?? DEFAULT_DOMAIN_VALUE}
          onChange={onDomainChange}
          isDisabled={isEditing}
          width="45%"
        />
        <InputGroupText>/</InputGroupText>
        <TextInput
          label="Back-half"
          isLabelHidden
          placeholder="spring-launch"
          value={slug}
          onChange={onSlugChange}
          isDisabled={isEditing}
          width="100%"
        />
        {!isEditing ? (
          <Button
            variant="secondary"
            label="Generate"
            tooltip="Generate a random back-half"
            onClick={onGenerate}
          />
        ) : null}
      </InputGroup>
      {!status ? (
        <Text type="supporting" color="secondary">
          {isEditing
            ? 'The domain and back-half can’t be changed after a link is created, so shared links and QR codes keep working.'
            : slug.trim()
              ? `${shortUrl.replace(/^https?:\/\//, '')} is available.`
              : 'Leave the back-half blank and we’ll generate one.'}
        </Text>
      ) : null}
    </VStack>
  )
})

const FolderField = memo(function FolderField() {
  const { set } = useLinkForm()
  const { folders, createFolder } = useOrganization()
  const folderId = useDraftValue('folderId')
  const onChange = useCallback((id: string | null) => set('folderId', id), [set])
  return (
    <FolderPicker
      folders={folders}
      value={folderId}
      onChange={onChange}
      onCreateFolder={createFolder}
    />
  )
})

const TagsField = memo(function TagsField() {
  const { set } = useLinkForm()
  const { links } = useOrganization()
  const tags = useDraftValue('tags')

  const tagSource = useMemo(() => {
    const existing = [...new Set(links.flatMap((l) => l.tags ?? []))].sort()
    return createStaticSource(existing.map((t) => ({ id: t, label: t })))
  }, [links])
  const value = useMemo(() => tags.map((t) => ({ id: t, label: t })), [tags])
  const onChange = useCallback(
    (items: { label: string }[]) =>
      set(
        'tags',
        [...new Set(items.map((i) => i.label.trim().toLowerCase()))].filter(Boolean),
      ),
    [set],
  )

  return (
    <Tokenizer
      label="Tags"
      placeholder="Add tags…"
      searchSource={tagSource}
      value={value}
      onChange={onChange}
      hasCreate
      debounceMs={0}
      width="100%"
    />
  )
})

export const ShortLinkSection = memo(function ShortLinkSection() {
  return (
    <FormSection
      title="Short link"
      description="The address people see and share."
    >
      <ShortLinkInput />
      <FieldRow>
        <FolderField />
        <TagsField />
      </FieldRow>
    </FormSection>
  )
})

const PasswordInput = memo(function PasswordInput() {
  const { set, hasSavedPassword } = useLinkForm()
  const value = useDraftValue('password')
  const status = useFieldStatus('password')
  const onChange = useCallback((next: string) => set('password', next), [set])
  return (
    <PasswordField
      label="Password"
      description={
        hasSavedPassword
          ? 'A password is set. Leave this blank to keep it, or type a new one.'
          : `At least ${MIN_PASSWORD_LENGTH} characters. Share it separately from the link.`
      }
      // The real password is never readable; dots show one is set.
      placeholder={hasSavedPassword ? '••••••••••••' : undefined}
      value={value}
      onChange={onChange}
      status={status}
      // A visitor password, not the user's own: keep the browser from filling theirs in.
      autoComplete="new-password"
    />
  )
})

export const PasswordSection = memo(function PasswordSection() {
  const { set } = useLinkForm()
  const enabled = useDraftValue('passwordEnabled')
  const toggle = useMemo(
    () => ({
      label: 'Require a password',
      value: enabled,
      onChange: (on: boolean) => set('passwordEnabled', on),
    }),
    [enabled, set],
  )
  return (
    <FormSection
      title="Password protection"
      description="Visitors must enter a password before they’re sent on."
      toggle={toggle}
    >
      <PasswordInput />
    </FormSection>
  )
})

const TitleInput = memo(function TitleInput() {
  const host = useDraftSelect((d) => hostOf(normalizeUrl(d.destination)))
  return (
    <DraftTextInput
      field="title"
      label="Title"
      placeholder={host || 'Spring launch landing page'}
      isOptional
      width="100%"
    />
  )
})

export const DetailsSection = memo(function DetailsSection() {
  return (
    <FormSection
      title="Details"
      description="Only your team sees these — they help you find the link later."
    >
      <TitleInput />
      <DraftTextArea
        field="description"
        label="Notes"
        placeholder="What this link is for, where it’s posted, who owns it…"
        rows={3}
        maxLength={MAX_LINK_NOTES_LENGTH}
        isOptional
        width="100%"
      />
    </FormSection>
  )
})
