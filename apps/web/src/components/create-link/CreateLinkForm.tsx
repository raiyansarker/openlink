import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import {
  DateTimeInput,
  type ISODateTimeString,
} from '@astryxdesign/core/DateTimeInput'
import { FileInput } from '@astryxdesign/core/FileInput'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { IconButton } from '@astryxdesign/core/IconButton'
import { InputGroup, InputGroupText } from '@astryxdesign/core/InputGroup'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { TextArea } from '@astryxdesign/core/TextArea'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Tokenizer } from '@astryxdesign/core/Tokenizer'
import { createStaticSource } from '@astryxdesign/core/Typeahead'
import { VStack } from '@astryxdesign/core/VStack'
import { useKeyPress } from '#/hooks/use-key-press'
import CreateLinkSuccess from '#/components/create-link/CreateLinkSuccess'
import Favicon from '#/components/create-link/Favicon'
import HoldPagePreview from '#/components/create-link/HoldPagePreview'
import FormSection, {
  FieldRow,
  OptionRow,
  WithCounter,
} from '#/components/create-link/FormSection'
import CreateLinkShell from '#/components/create-link/CreateLinkShell'
import LinkPreviewPanel, {
  CreateLinkActions,
  type PreviewRule,
} from '#/components/create-link/LinkPreviewPanel'
import SocialPreviewCard from '#/components/create-link/SocialPreviewCard'
import { useOrganization } from '#/contexts/OrganizationContext'
import { getCustomDomainsForOrg } from '#/data/demo/queries'
import {
  defaultShortHost,
  shortHostFor,
  shortUrlFor,
} from '#/data/demo/short-url'
import type { HoldPage, RedirectStatusCode, ShortLink } from '#/data/demo/types'
import { buildDashboardOrgPath } from '#/lib/dashboard/build-org-path'
import { formatCompactNumber } from '#/lib/format/compact-number'
import { countryFlag, countryName, getCountries } from '#/lib/links/countries'
import {
  applyUtm,
  cleanUtm,
  emptyDraft,
  generateSlug,
  initialStatus,
  isHttpUrl,
  MAX_PREVIEW_DESCRIPTION,
  MAX_PREVIEW_IMAGE_BYTES,
  PREVIEW_IMAGE_ACCEPT,
  MAX_PREVIEW_TITLE,
  MIN_PASSWORD_LENGTH,
  normalizeUrl,
  linkToDraft,
  readUtmFromUrl,
  validateDraft,
  type CreateLinkDraft,
  type DraftErrors,
  type GeoRuleRow,
  type MetadataRow,
  type UtmKey,
} from '#/lib/links/create-link'
import { folderPathLabel } from '#/lib/links/folder-tree'
import { HOLD_PAGES, holdPageMeta } from '#/lib/links/hold-pages'

const DEFAULT_DOMAIN_VALUE = '__default__'
const ROOT_FOLDER_VALUE = '__root__'

const REDIRECT_OPTIONS: {
  value: RedirectStatusCode
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

const UTM_FIELDS: { key: UtmKey; label: string; placeholder: string }[] = [
  { key: 'source', label: 'Source', placeholder: 'newsletter' },
  { key: 'medium', label: 'Medium', placeholder: 'email' },
  { key: 'campaign', label: 'Campaign', placeholder: 'spring_launch' },
  { key: 'term', label: 'Term', placeholder: 'running+shoes' },
  { key: 'content', label: 'Content', placeholder: 'hero_button' },
]

/** "YYYY-MM-DDTHH:mm" in local time, the DateTimeInput value format. */
function toLocalInputValue(date: Date): ISODateTimeString {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}` as ISODateTimeString
}

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

function formatLocal(value: string | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function rowId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/** Plain-language "how it works" list used by the cloaking option. */
function HowItWorks({ steps }: { steps: string[] }) {
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
}

type CreateLinkFormProps = {
  initialFolderId: string | null
  /** When set, the form edits this link instead of creating one. */
  editLink?: ShortLink
}

export default function CreateLinkForm({
  initialFolderId,
  editLink,
}: CreateLinkFormProps) {
  const isEditing = editLink != null
  const navigate = useNavigate()
  const { activeOrg, links, folders, createLink, updateLink } = useOrganization()

  const [draft, setDraft] = useState<CreateLinkDraft>(() =>
    editLink ? linkToDraft(editLink) : emptyDraft(initialFolderId),
  )
  const [showErrors, setShowErrors] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [created, setCreated] = useState<ShortLink | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [previewFileError, setPreviewFileError] = useState<string | null>(null)

  /** Reads an uploaded social image into a data: URL (kept with the link). */
  const choosePreviewImage = (file: File | null) => {
    setPreviewFileError(null)
    setPreviewFile(file)
    if (!file) {
      update('previewImage', '')
      return
    }
    if (!PREVIEW_IMAGE_ACCEPT.split(',').includes(file.type)) {
      setPreviewFileError('Use a PNG, JPG, WebP or GIF image.')
      setPreviewFile(null)
      return
    }
    if (file.size > MAX_PREVIEW_IMAGE_BYTES) {
      setPreviewFileError('Images must be 5 MB or smaller.')
      setPreviewFile(null)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') update('previewImage', reader.result)
    }
    reader.onerror = () => setPreviewFileError('That image couldn’t be read.')
    reader.readAsDataURL(file)
  }

  const update = <K extends keyof CreateLinkDraft>(
    key: K,
    value: CreateLinkDraft[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSubmitError(null)
  }

  // Suggest a random back-half after mount (not during SSR, to keep
  // hydration deterministic). An unknown ?folder= falls back to the top level.
  useEffect(() => {
    if (isEditing) return
    setDraft((prev) => ({
      ...prev,
      slug: prev.slug || generateSlug(),
      folderId:
        prev.folderId && folders.some((f) => f.id === prev.folderId)
          ? prev.folderId
          : null,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const domains = useMemo(
    () => getCustomDomainsForOrg(activeOrg.id),
    [activeOrg.id],
  )

  const domainOptions = useMemo(
    () => [
      {
        value: DEFAULT_DOMAIN_VALUE,
        label: defaultShortHost(activeOrg),
        description: 'Default OpenLink domain',
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
    [activeOrg, domains],
  )

  const folderOptions = useMemo(
    () => [
      { value: ROOT_FOLDER_VALUE, label: 'All links (top level)' },
      ...folders
        .map((f) => ({ value: f.id, label: folderPathLabel(folders, f.id) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [folders],
  )

  const tagSource = useMemo(() => {
    const existing = [...new Set(links.flatMap((l) => l.tags))].sort()
    return createStaticSource(existing.map((t) => ({ id: t, label: t })))
  }, [links])

  const countries = useMemo(() => getCountries(), [])

  const errors: DraftErrors = useMemo(
    () =>
      validateDraft(draft, {
        links,
        editing: editLink
          ? { linkId: editLink.id, hasPassword: !!editLink.passwordProtected }
          : undefined,
      }),
    [draft, links, editLink],
  )
  // Slug conflicts are worth flagging while typing; the rest after submit.
  const visibleError = (field: keyof DraftErrors) =>
    showErrors || (field === 'slug' && draft.slug) ? errors[field] : undefined
  const statusFor = (field: keyof DraftErrors) => {
    const message = visibleError(field)
    return message ? { type: 'error' as const, message } : undefined
  }

  const destination = normalizeUrl(draft.destination)
  const destinationIsValid = isHttpUrl(destination)
  const utm = draft.utmEnabled ? cleanUtm(draft.utm) : undefined
  const finalDestination = destinationIsValid ? applyUtm(destination, utm) : ''
  const shortHost = shortHostFor(activeOrg, draft.domainId)
  const shortUrl = shortUrlFor(
    draft.slug.trim() || '…',
    activeOrg,
    draft.domainId,
  )
  const status = initialStatus(draft)
  const host = hostOf(destination)
  const displayTitle = draft.title.trim() || host || 'Untitled link'

  const targetingSummary = (() => {
    if (!draft.targetingEnabled) return null
    const parts: string[] = []
    if (draft.iosUrl.trim()) parts.push('iOS')
    if (draft.androidUrl.trim()) parts.push('Android')
    const geo = draft.geoRules.filter((r) => r.country && r.url.trim()).length
    if (geo > 0) parts.push(`${geo} ${geo === 1 ? 'country' : 'countries'}`)
    return parts.length > 0 ? parts.join(', ') : null
  })()

  const previewHasContent =
    draft.previewEnabled &&
    !!(
      draft.previewTitle.trim() ||
      draft.previewDescription.trim() ||
      draft.previewImage.trim()
    )

  const rules: PreviewRule[] = [
    { label: 'Folder', value: folderPathLabel(folders, draft.folderId) },
    draft.cloakEnabled
      ? { label: 'Delivery', value: 'Cloaked — URL stays short' }
      : {
          label: 'Redirect',
          value: `${draft.redirectStatus} ${draft.redirectStatus === 301 || draft.redirectStatus === 308 ? 'permanent' : 'temporary'}`,
        },
    ...(draft.holdEnabled
      ? [
          {
            label: 'Hold mode',
            value:
              holdPageMeta(draft.holdPage).label +
              (draft.holdReleaseEnabled && draft.holdReleaseAt
                ? ` until ${formatLocal(draft.holdReleaseAt)}`
                : ''),
          },
        ]
      : []),
    ...(targetingSummary
      ? [{ label: 'Targeting', value: targetingSummary }]
      : []),
    ...(draft.scheduleEnabled && draft.activateAt
      ? [{ label: 'Starts', value: formatLocal(draft.activateAt) }]
      : []),
    ...(draft.expiryEnabled && draft.expiresAt
      ? [{ label: 'Expires', value: formatLocal(draft.expiresAt) }]
      : []),
    ...(draft.clickLimitEnabled && draft.maxClicks
      ? [
          {
            label: 'Click limit',
            value: `${formatCompactNumber(draft.maxClicks)} clicks`,
          },
        ]
      : []),
    ...((draft.expiryEnabled || draft.clickLimitEnabled) &&
    draft.expiredDestination.trim()
      ? [
          {
            label: 'After expiry',
            value: hostOf(normalizeUrl(draft.expiredDestination)) || '—',
          },
        ]
      : []),
    ...(draft.passwordEnabled
      ? [{ label: 'Password', value: 'Required to open' }]
      : []),
    ...(draft.fallbackDestination.trim()
      ? [
          {
            label: 'Fallback',
            value: hostOf(normalizeUrl(draft.fallbackDestination)) || '—',
          },
        ]
      : []),
    ...(utm
      ? [{ label: 'UTM', value: `${Object.keys(utm).length} parameters` }]
      : []),
    ...(previewHasContent ? [{ label: 'Social preview', value: 'Custom' }] : []),
    ...(draft.metadata.some((r) => r.key.trim())
      ? [
          {
            label: 'Metadata',
            value: `${draft.metadata.filter((r) => r.key.trim()).length} fields`,
          },
        ]
      : []),
  ]

  const statusLine = draft.holdEnabled
    ? `On hold — visitors see “${holdPageMeta(draft.holdPage).heading}”${
        draft.holdReleaseEnabled && draft.holdReleaseAt
          ? ` until ${formatLocal(draft.holdReleaseAt)}`
          : ' until you release it'
      }.`
    : status === 'scheduled'
      ? `Scheduled — starts redirecting ${formatLocal(draft.activateAt)}.`
      : 'Goes live as soon as you create it.'

  const linksPath = buildDashboardOrgPath(activeOrg.slug, 'links')
  const qrFileName = `${shortHost}-${draft.slug.trim() || 'link'}`.replace(
    /[^A-Za-z0-9._-]/g,
    '-',
  )

  const submit = () => {
    if (created) return
    setShowErrors(true)
    if (Object.keys(errors).length > 0) {
      setSubmitError('Fix the highlighted fields to create the link.')
      return
    }
    try {
      if (editLink) {
        updateLink(editLink.id, draft)
        goToDetail(editLink.id)
        return
      }
      setCreated(createLink(draft))
      window.scrollTo({ top: 0 })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const goToDetail = (linkId: string) => {
    void navigate({
      to: '/dashboard/$orgSlug/links/$linkId',
      params: { orgSlug: activeOrg.slug, linkId },
    })
  }

  const goToLinks = (folderId: string | null) => {
    void navigate({ to: linksPath, search: { folder: folderId ?? undefined } })
  }

  // ⌘/Ctrl + Enter submits from anywhere on the page.
  useKeyPress('mod+Enter', () => submit(), { allowInInputs: true, allowInOverlays: true })

  const setUtmField = (key: UtmKey, value: string) =>
    update('utm', { ...draft.utm, [key]: value })

  const toggleUtm = (on: boolean) => {
    // Turning UTM on pulls in any utm_* params already in the URL.
    if (on && !cleanUtm(draft.utm)) {
      setDraft((prev) => ({
        ...prev,
        utmEnabled: true,
        utm: readUtmFromUrl(prev.destination),
      }))
      return
    }
    update('utmEnabled', on)
  }

  const setMetadataRow = (id: string, patch: Partial<MetadataRow>) =>
    update(
      'metadata',
      draft.metadata.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )

  const setGeoRow = (id: string, patch: Partial<GeoRuleRow>) =>
    update(
      'geoRules',
      draft.geoRules.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )

  const toggleTargeting = (on: boolean) => {
    setDraft((prev) => ({
      ...prev,
      targetingEnabled: on,
      // Start with one empty country row so the list isn't blank.
      geoRules:
        on && prev.geoRules.length === 0
          ? [{ id: rowId('geo'), country: '', url: '' }]
          : prev.geoRules,
    }))
  }

  const nowValue = toLocalInputValue(new Date())
  const hasExpiryRule = draft.expiryEnabled || draft.clickLimitEnabled

  if (created) {
    const createdUrl = shortUrlFor(created.slug, activeOrg, created.domainId)
    return (
      <CreateLinkShell
        backTo={linksPath}
        backSearch={{ folder: created.folderId ?? undefined }}
        main={
          <CreateLinkSuccess
            title={created.title}
            shortUrl={createdUrl}
            destination={created.targetUrl}
            folderLabel={folderPathLabel(folders, created.folderId ?? null)}
            rules={rules.filter((r) => r.label !== 'Folder')}
            tags={created.tags}
            qrFileName={`${shortHostFor(activeOrg, created.domainId)}-${created.slug}`}
            onViewLinks={() => goToLinks(created.folderId ?? null)}
            onCreateAnother={() => {
              setCreated(null)
              setShowErrors(false)
              setPreviewFile(null)
              setPreviewFileError(null)
              setDraft({ ...emptyDraft(created.folderId ?? null), slug: generateSlug() })
            }}
          />
        }
      />
    )
  }

  const form = (
    <VStack gap={8} hAlign="stretch" width="100%">
      <VStack gap={1}>
        <Heading level={1}>{isEditing ? 'Edit link' : 'Create link'}</Heading>
        <Text color="secondary">
          {isEditing
            ? `Changes apply to ${shortUrl.replace(/^https?:\/\//, '')} as soon as you save.`
            : `Shorten a URL for ${activeOrg.name}, then decide who goes where.`}
        </Text>
      </VStack>

      {submitError ? <Banner status="error" title={submitError} /> : null}

          <VStack gap={0} hAlign="stretch" width="100%">
            <FormSection
              title="Destination"
              description="Where people end up when they open the short link."
            >
              <TextInput
                type="url"
                label="Destination URL"
                placeholder="https://example.com/spring-launch"
                startIcon={<Favicon url={destinationIsValid ? destination : ''} />}
                value={draft.destination}
                onChange={(value) => update('destination', value)}
                status={statusFor('destination')}
                hasAutoFocus
                isRequired
                width="100%"
              />
            </FormSection>

            <FormSection
              title="Short link"
              description="The address people see and share."
            >
              <VStack gap={2} hAlign="stretch" width="100%">
                <InputGroup
                  label="Short link"
                  isLabelHidden
                  className="ol-connected-group"
                  status={statusFor('slug')}
                >
                  <Selector
                    label="Domain"
                    isLabelHidden
                    options={domainOptions}
                    value={draft.domainId ?? DEFAULT_DOMAIN_VALUE}
                    onChange={(value) =>
                      update(
                        'domainId',
                        value === DEFAULT_DOMAIN_VALUE ? null : value,
                      )
                    }
                    isDisabled={isEditing}
                    width="45%"
                  />
                  <InputGroupText>/</InputGroupText>
                  <TextInput
                    label="Back-half"
                    isLabelHidden
                    placeholder="spring-launch"
                    value={draft.slug}
                    onChange={(value) => update('slug', value)}
                    isDisabled={isEditing}
                    width="100%"
                  />
                  {!isEditing ? (
                    <Button
                      variant="secondary"
                      label="Generate"
                      tooltip="Generate a random back-half"
                      onClick={() => update('slug', generateSlug())}
                    />
                  ) : null}
                </InputGroup>
                {!visibleError('slug') ? (
                  <Text type="supporting" color="secondary">
                    {isEditing
                      ? 'The domain and back-half can’t be changed after a link is created, so shared links and QR codes keep working.'
                      : draft.slug.trim()
                        ? `${shortUrl.replace(/^https?:\/\//, '')} is available.`
                        : 'Leave the back-half blank and we’ll generate one.'}
                  </Text>
                ) : null}
              </VStack>
              <FieldRow>
                <Selector
                  label="Folder"
                  options={folderOptions}
                  value={draft.folderId ?? ROOT_FOLDER_VALUE}
                  onChange={(value) =>
                    update('folderId', value === ROOT_FOLDER_VALUE ? null : value)
                  }
                  width="100%"
                />
                <Tokenizer
                  label="Tags"
                  placeholder="Add tags…"
                  searchSource={tagSource}
                  value={draft.tags.map((t) => ({ id: t, label: t }))}
                  onChange={(items) =>
                    update(
                      'tags',
                      [
                        ...new Set(items.map((i) => i.label.trim().toLowerCase())),
                      ].filter(Boolean),
                    )
                  }
                  hasCreate
                  debounceMs={0}
                  width="100%"
                />
              </FieldRow>
            </FormSection>

            <FormSection
              title="Password protection"
              description="Visitors must enter a password before they’re sent on."
              toggle={{
                label: 'Require a password',
                value: draft.passwordEnabled,
                onChange: (on) => update('passwordEnabled', on),
              }}
            >
              <HStack gap={2} vAlign="end" width="100%">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TextInput
                    type={isPasswordVisible ? 'text' : 'password'}
                    label="Password"
                    description={
                      isEditing && editLink?.passwordProtected
                        ? 'Leave blank to keep the current password, or type a new one.'
                        : `At least ${MIN_PASSWORD_LENGTH} characters. Share it separately from the link.`
                    }
                    value={draft.password}
                    onChange={(value) => update('password', value)}
                    status={statusFor('password')}
                    width="100%"
                  />
                </div>
                <Button
                  variant="secondary"
                  label={isPasswordVisible ? 'Hide' : 'Show'}
                  onClick={() => setIsPasswordVisible((v) => !v)}
                />
              </HStack>
            </FormSection>

            <FormSection
              title="Details"
              description="Only your team sees these — they help you find the link later."
            >
              <TextInput
                label="Title"
                placeholder={host || 'Spring launch landing page'}
                value={draft.title}
                onChange={(value) => update('title', value)}
                isOptional
                width="100%"
              />
              <TextArea
                label="Notes"
                placeholder="What this link is for, where it’s posted, who owns it…"
                value={draft.description}
                onChange={(value) => update('description', value)}
                rows={3}
                isOptional
                width="100%"
              />
            </FormSection>

            <FormSection
              title="Targeting"
              description="Send people to a different destination based on their device or country. Everyone else goes to the main destination."
              toggle={{
                label: 'Enable targeting',
                value: draft.targetingEnabled,
                onChange: toggleTargeting,
              }}
            >
              <FieldRow>
                <TextInput
                  type="url"
                  label="iOS destination"
                  description="iPhone and iPad visitors."
                  placeholder="https://apps.apple.com/app/…"
                  startIcon={<Favicon url={isHttpUrl(normalizeUrl(draft.iosUrl)) ? normalizeUrl(draft.iosUrl) : ''} />}
                  value={draft.iosUrl}
                  onChange={(value) => update('iosUrl', value)}
                  status={statusFor('iosUrl')}
                  isOptional
                  width="100%"
                />
                <TextInput
                  type="url"
                  label="Android destination"
                  description="Android phones and tablets."
                  placeholder="https://play.google.com/store/apps/…"
                  startIcon={<Favicon url={isHttpUrl(normalizeUrl(draft.androidUrl)) ? normalizeUrl(draft.androidUrl) : ''} />}
                  value={draft.androidUrl}
                  onChange={(value) => update('androidUrl', value)}
                  status={statusFor('androidUrl')}
                  isOptional
                  width="100%"
                />
              </FieldRow>

              <VStack gap={3} hAlign="stretch" width="100%">
                <VStack gap={1}>
                  <Text weight="semibold">Countries</Text>
                  <Text type="supporting" color="secondary">
                    Device rules are checked first, then the visitor’s country.
                  </Text>
                </VStack>
                {draft.geoRules.map((row) => {
                  const usedElsewhere = new Set(
                    draft.geoRules
                      .filter((r) => r.id !== row.id && r.country)
                      .map((r) => r.country),
                  )
                  return (
                    <HStack key={row.id} gap={2} vAlign="start" width="100%">
                      <div style={{ flex: '0 0 40%', minWidth: 0 }}>
                        <Selector
                          label="Country"
                          isLabelHidden
                          placeholder="Choose a country"
                          options={countries.map((c) => ({
                            value: c.code,
                            label: `${countryFlag(c.code)}  ${c.name}`,
                            disabled: usedElsewhere.has(c.code),
                          }))}
                          value={row.country || undefined}
                          onChange={(value) => setGeoRow(row.id, { country: value })}
                          hasSearch
                          searchPlaceholder="Search countries"
                          width="100%"
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <TextInput
                          type="url"
                          label={`Destination for ${row.country ? countryName(row.country) : 'this country'}`}
                          isLabelHidden
                          placeholder="https://example.com/uk"
                          value={row.url}
                          onChange={(value) => setGeoRow(row.id, { url: value })}
                          width="100%"
                        />
                      </div>
                      <IconButton
                        variant="ghost"
                        label="Remove country rule"
                        icon={<span aria-hidden>×</span>}
                        onClick={() =>
                          update(
                            'geoRules',
                            draft.geoRules.filter((r) => r.id !== row.id),
                          )
                        }
                      />
                    </HStack>
                  )
                })}
                {visibleError('geoRules') ? (
                  <Text type="supporting" style={{ color: 'var(--color-text-error, inherit)' }}>
                    {visibleError('geoRules')}
                  </Text>
                ) : null}
                <HStack>
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Add country"
                    onClick={() =>
                      update('geoRules', [
                        ...draft.geoRules,
                        { id: rowId('geo'), country: '', url: '' },
                      ])
                    }
                  />
                </HStack>
              </VStack>
            </FormSection>

            <FormSection
              title="UTM parameters"
              description="Tag traffic for Google Analytics and other tools. Added to the destination when the link opens."
              toggle={{
                label: 'Add UTM parameters',
                value: draft.utmEnabled,
                onChange: toggleUtm,
              }}
            >
              <FieldRow>
                {UTM_FIELDS.map((field) => (
                  <TextInput
                    key={field.key}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={draft.utm[field.key] ?? ''}
                    onChange={(value) => setUtmField(field.key, value)}
                    width="100%"
                  />
                ))}
              </FieldRow>
              {finalDestination && utm ? (
                <VStack
                  gap={1}
                  hAlign="stretch"
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--color-background-muted)',
                  }}
                >
                  <Text type="supporting" color="secondary">
                    Final URL
                  </Text>
                  <Text type="supporting" style={{ wordBreak: 'break-all' }}>
                    {finalDestination}
                  </Text>
                </VStack>
              ) : null}
            </FormSection>

            <FormSection
              title="Social preview"
              description="The title, description and image people see when the link is shared on X, Slack, LinkedIn or iMessage. Blank fields use the link’s title. See the live card in the preview panel."
              toggle={{
                label: 'Customize social preview',
                value: draft.previewEnabled,
                onChange: (on) => update('previewEnabled', on),
              }}
            >
              <WithCounter count={draft.previewTitle.trim().length} max={MAX_PREVIEW_TITLE}>
                <TextInput
                  label="Share title"
                  placeholder={draft.title.trim() || host || 'Spring launch — 20% off everything'}
                  value={draft.previewTitle}
                  onChange={(value) => update('previewTitle', value)}
                  status={statusFor('previewTitle')}
                  isOptional
                  width="100%"
                />
              </WithCounter>
              <WithCounter
                count={draft.previewDescription.trim().length}
                max={MAX_PREVIEW_DESCRIPTION}
              >
                <TextArea
                  label="Share description"
                  placeholder="A sentence or two that makes people want to click."
                  value={draft.previewDescription}
                  onChange={(value) => update('previewDescription', value)}
                  status={statusFor('previewDescription')}
                  rows={2}
                  isOptional
                  width="100%"
                />
              </WithCounter>
              {draft.previewImage && !previewFile ? (
                <HStack gap={3} vAlign="center" width="100%">
                  <img
                    src={draft.previewImage}
                    alt="Current social preview image"
                    style={{
                      width: 96,
                      aspectRatio: '1.91 / 1',
                      objectFit: 'cover',
                      borderRadius: 8,
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <VStack gap={1} style={{ flex: 1, minWidth: 0 }}>
                    <Text weight="semibold">Current image</Text>
                    <Text type="supporting" color="secondary">
                      Drop a new one below to replace it.
                    </Text>
                  </VStack>
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Remove"
                    onClick={() => update('previewImage', '')}
                  />
                </HStack>
              ) : null}
              <FileInput
                label="Image"
                mode="dropzone"
                accept={PREVIEW_IMAGE_ACCEPT}
                maxSize={MAX_PREVIEW_IMAGE_BYTES}
                description="PNG, JPG, WebP or GIF up to 5 MB. 1200 × 630 px looks best everywhere."
                placeholder="Drop an image here, or click to browse"
                value={previewFile}
                onChange={(files) =>
                  choosePreviewImage(Array.isArray(files) ? (files[0] ?? null) : files)
                }
                status={
                  previewFileError
                    ? { type: 'error', message: previewFileError }
                    : statusFor('previewImage')
                }
                isOptional
                width="100%"
              />
            </FormSection>

            <FormSection
              title="Delivery"
              description="How visitors get to the destination."
            >
              <VStack gap={3} hAlign="stretch" width="100%">
                <SegmentedControl
                  label="Redirect type"
                  value={String(draft.redirectStatus)}
                  onChange={(value) =>
                    update('redirectStatus', Number(value) as RedirectStatusCode)
                  }
                  layout="fill"
                  isDisabled={draft.cloakEnabled}
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
                  {draft.cloakEnabled
                    ? 'Redirect type isn’t used while link cloaking is on.'
                    : REDIRECT_OPTIONS.find((o) => o.value === draft.redirectStatus)
                        ?.help}
                </Text>
              </VStack>

              <OptionRow
                hasDivider
                title="Link cloaking"
                description={`Visitors keep seeing ${shortHost} in the address bar instead of the destination’s URL.`}
                toggle={{
                  label: 'Cloak the destination',
                  value: draft.cloakEnabled,
                  onChange: (on) => update('cloakEnabled', on),
                }}
              >
                <HowItWorks
                  steps={[
                    `Someone opens ${shortHost}/${draft.slug.trim() || '…'}.`,
                    'Instead of redirecting, OpenLink serves a page that loads the destination full-screen inside it (an iframe).',
                    `The address bar keeps showing ${shortHost}, and the social preview above is what gets shared.`,
                    'Clicks on links inside the page stay in the frame; links that open new tabs show the real site.',
                  ]}
                />
                <Banner
                  status="warning"
                  title="Not every site can be cloaked"
                  description="Sites that block being framed (most banks, Google, and social networks) show a blank page. Check the destination after creating the link."
                />
              </OptionRow>
            </FormSection>

            <FormSection
              title="Hold mode"
              description="Keep the link but don’t send anyone through yet. Visitors see a placeholder error page instead of the destination, as if the site were temporarily down."
              toggle={{
                label: 'Put the link on hold',
                value: draft.holdEnabled,
                onChange: (on) => update('holdEnabled', on),
              }}
            >
              <VStack gap={2} hAlign="stretch" width="100%">
                <Text weight="semibold">Page to show</Text>
                <div
                  role="radiogroup"
                  aria-label="Page to show"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))',
                    gap: 10,
                  }}
                >
                  {HOLD_PAGES.map((option) => {
                    const isSelected = draft.holdPage === option.page
                    return (
                      <button
                        key={option.page}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => update('holdPage', option.page as HoldPage)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          padding: 8,
                          borderRadius: 10,
                          cursor: 'pointer',
                          textAlign: 'start',
                          fontFamily: 'inherit',
                          background: 'var(--color-background-surface)',
                          border: isSelected
                            ? '2px solid var(--color-text-primary)'
                            : '2px solid var(--color-border)',
                        }}
                      >
                        <HoldPagePreview page={option.page} url={shortHost} isCompact />
                        <Text type="supporting" weight="semibold">
                          {option.label}
                        </Text>
                      </button>
                    )
                  })}
                </div>
              </VStack>

              <VStack gap={2} hAlign="stretch" width="100%">
                <Text weight="semibold">What visitors see</Text>
                <HoldPagePreview
                  page={draft.holdPage}
                  url={shortUrl.replace(/^https?:\/\//, '')}
                />
                <Text type="supporting" color="secondary">
                  Served with a real HTTP {holdPageMeta(draft.holdPage).status} status, so it looks the same to browsers and link checkers.
                </Text>
              </VStack>

              <OptionRow
                hasDivider
                title="Release automatically"
                description="Lift the hold at a set time. Otherwise, release it yourself from the link’s menu in Links."
                toggle={{
                  label: 'Release automatically',
                  value: draft.holdReleaseEnabled,
                  onChange: (on) => update('holdReleaseEnabled', on),
                }}
              >
                <DateTimeInput
                  label="Release at"
                  value={draft.holdReleaseAt as ISODateTimeString | undefined}
                  onChange={(value) => update('holdReleaseAt', value)}
                  min={nowValue}
                  status={statusFor('holdReleaseAt')}
                  width="100%"
                />
              </OptionRow>
            </FormSection>

            <FormSection
              title="Availability"
              description="Control when the link works and when it stops."
            >
              <OptionRow
                title="Schedule"
                description="Publish the link later instead of right away."
                toggle={{
                  label: 'Schedule activation',
                  value: draft.scheduleEnabled,
                  onChange: (on) => update('scheduleEnabled', on),
                }}
              >
                <DateTimeInput
                  label="Starts at"
                  description="Before this, visitors go to the fallback URL if you set one."
                  value={draft.activateAt as ISODateTimeString | undefined}
                  onChange={(value) => update('activateAt', value)}
                  min={nowValue}
                  status={statusFor('activateAt')}
                  width="100%"
                />
              </OptionRow>
              <OptionRow
                hasDivider
                title="Expiration"
                description="Stop the link at a set time."
                toggle={{
                  label: 'Set an expiration date',
                  value: draft.expiryEnabled,
                  onChange: (on) => update('expiryEnabled', on),
                }}
              >
                <DateTimeInput
                  label="Expires at"
                  value={draft.expiresAt as ISODateTimeString | undefined}
                  onChange={(value) => update('expiresAt', value)}
                  min={(draft.scheduleEnabled && draft.activateAt
                    ? draft.activateAt
                    : nowValue) as ISODateTimeString}
                  status={statusFor('expiresAt')}
                  width="100%"
                />
              </OptionRow>
              <OptionRow
                hasDivider
                title="Click limit"
                description="Expire after a number of clicks — handy for giveaways and one-time offers."
                toggle={{
                  label: 'Limit clicks',
                  value: draft.clickLimitEnabled,
                  onChange: (on) => update('clickLimitEnabled', on),
                }}
              >
                <NumberInput
                  label="Maximum clicks"
                  placeholder="1000"
                  value={draft.maxClicks}
                  onChange={(value) => update('maxClicks', value)}
                  min={1}
                  step={1}
                  isIntegerOnly
                  hasClear
                  units="clicks"
                  status={statusFor('maxClicks')}
                  width="100%"
                />
              </OptionRow>
              {hasExpiryRule ? (
                <TextInput
                  type="url"
                  label="After it expires, send visitors to"
                  description="Leave blank to show an “expired” page."
                  placeholder="https://example.com/offer-ended"
                  value={draft.expiredDestination}
                  onChange={(value) => update('expiredDestination', value)}
                  status={statusFor('expiredDestination')}
                  isOptional
                  width="100%"
                />
              ) : null}
            </FormSection>

            <FormSection
              title="Advanced"
              description="Fallbacks and data for your own integrations."
            >
              <TextInput
                type="url"
                label="Fallback URL"
                description="Where visitors go when the link isn’t serving — before it starts, or while it’s paused."
                placeholder="https://example.com"
                value={draft.fallbackDestination}
                onChange={(value) => update('fallbackDestination', value)}
                status={statusFor('fallbackDestination')}
                isOptional
                width="100%"
              />
              <VStack gap={3} hAlign="stretch" width="100%">
                <VStack gap={1}>
                  <Text weight="semibold">Custom metadata</Text>
                  <Text type="supporting" color="secondary">
                    Key–value pairs stored with the link (e.g. owner, cost center).
                  </Text>
                </VStack>
                {draft.metadata.map((row) => (
                  <HStack key={row.id} gap={2} vAlign="start" width="100%">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <TextInput
                        label="Key"
                        isLabelHidden
                        placeholder="owner"
                        value={row.key}
                        onChange={(value) => setMetadataRow(row.id, { key: value })}
                        width="100%"
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <TextInput
                        label={`Value for ${row.key || 'field'}`}
                        isLabelHidden
                        placeholder="growth-team"
                        value={row.value}
                        onChange={(value) => setMetadataRow(row.id, { value })}
                        width="100%"
                      />
                    </div>
                    <IconButton
                      variant="ghost"
                      label={`Remove ${row.key || 'field'}`}
                      icon={<span aria-hidden>×</span>}
                      onClick={() =>
                        update(
                          'metadata',
                          draft.metadata.filter((r) => r.id !== row.id),
                        )
                      }
                    />
                  </HStack>
                ))}
                {visibleError('metadata') ? (
                  <Text type="supporting" style={{ color: 'var(--color-text-error, inherit)' }}>
                    {visibleError('metadata')}
                  </Text>
                ) : null}
                <HStack>
                  <Button
                    variant="secondary"
                    size="sm"
                    label="Add field"
                    onClick={() =>
                      update('metadata', [
                        ...draft.metadata,
                        { id: rowId('meta'), key: '', value: '' },
                      ])
                    }
                  />
                </HStack>
              </VStack>
            </FormSection>
          </VStack>
    </VStack>
  )

  return (
    <CreateLinkShell
      backTo={
        editLink ? `/dashboard/${activeOrg.slug}/links/${editLink.id}` : linksPath
      }
      backLabel={editLink ? editLink.title : 'Links'}
      backSearch={editLink ? undefined : { folder: initialFolderId ?? undefined }}
      main={form}
      aside={
        <LinkPreviewPanel
          shortUrl={shortUrl}
          destination={finalDestination}
          title={displayTitle}
          statusLine={statusLine}
          rules={rules}
          tags={draft.tags}
          qrFileName={qrFileName}
          socialCard={
            draft.previewEnabled ? (
              <SocialPreviewCard
                host={shortHost}
                title={draft.previewTitle.trim() || displayTitle}
                description={draft.previewDescription.trim()}
                imageUrl={draft.previewImage}
              />
            ) : undefined
          }
        />
      }
      asideFooter={
        <CreateLinkActions
          submitLabel={isEditing ? 'Save changes' : 'Create link'}
          onSubmit={submit}
          onCancel={() =>
            editLink ? goToDetail(editLink.id) : goToLinks(initialFolderId)
          }
        />
      }
    />
  )
}
