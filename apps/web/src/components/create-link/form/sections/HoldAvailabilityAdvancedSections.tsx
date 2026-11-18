import { memo, useCallback, useMemo } from 'react'
import type { ISODateTimeString } from '@astryxdesign/core/DateTimeInput'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { IconButton } from '@astryxdesign/core/IconButton'
import { NumberInput } from '@astryxdesign/core/NumberInput'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import FormSection, { OptionRow } from '#/components/create-link/FormSection'
import HoldPagePreview from '#/components/create-link/HoldPagePreview'
import { HOLD_PAGES } from '#/lib/links/hold-pages'
import type { HoldPageId } from '#/lib/api/types'
import type { MetadataRow } from '#/lib/links/create-link'
import {
  DraftDateTimeInput,
  DraftTextInput,
} from '#/components/create-link/form/fields'
import {
  useDraftSelect,
  useDraftValue,
  useFieldError,
  useFieldStatus,
  useLinkForm,
  useShortHost,
  useShortUrl,
} from '#/components/create-link/form/LinkFormContext'
import { rowId } from '#/components/create-link/form/derive'

/** A switch bound to one boolean draft field, in the shape FormSection/OptionRow expect. */
function useToggle(
  field:
    | 'holdEnabled'
    | 'holdReleaseEnabled'
    | 'scheduleEnabled'
    | 'expiryEnabled'
    | 'clickLimitEnabled',
  label: string,
) {
  const { set } = useLinkForm()
  const value = useDraftValue(field)
  return useMemo(
    () => ({ label, value, onChange: (on: boolean) => set(field, on) }),
    [label, value, set, field],
  )
}

/* ------------------------------ Hold mode ------------------------------ */

const HoldPagePicker = memo(function HoldPagePicker() {
  const { set } = useLinkForm()
  const holdPage = useDraftValue('holdPage')
  const shortHost = useShortHost()
  return (
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
          const isSelected = holdPage === option.page
          return (
            <button
              key={option.page}
              className="ol-focus-ring"
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => set('holdPage', option.page as HoldPageId)}
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
  )
})

const HoldLivePreview = memo(function HoldLivePreview() {
  const holdPage = useDraftValue('holdPage')
  const shortUrl = useShortUrl()
  return (
    <VStack gap={2} hAlign="stretch" width="100%">
      <Text weight="semibold">What visitors see</Text>
      <HoldPagePreview page={holdPage} url={shortUrl.replace(/^https?:\/\//, '')} />
      <Text type="supporting" color="secondary">
        Visitors see this page in place of the destination. It is served with an error status, so link checkers report the link as down.
      </Text>
    </VStack>
  )
})

const HoldRelease = memo(function HoldRelease() {
  const toggle = useToggle('holdReleaseEnabled', 'Release automatically')
  return (
    <OptionRow
      hasDivider
      title="Release automatically"
      description="Lift the hold at a set time. Otherwise, release it yourself from the link’s menu in Links."
      toggle={toggle}
    >
      <DraftDateTimeInput field="holdReleaseAt" label="Release at" width="100%" />
    </OptionRow>
  )
})

export const HoldSection = memo(function HoldSection() {
  const toggle = useToggle('holdEnabled', 'Put the link on hold')
  return (
    <FormSection
      title="Hold mode"
      description="Keep the link but don’t send anyone through yet. Visitors see a placeholder error page instead of the destination, as if the site were temporarily down."
      toggle={toggle}
    >
      <HoldPagePicker />
      <HoldLivePreview />
      <HoldRelease />
    </FormSection>
  )
})

/* ----------------------------- Availability ----------------------------- */

const ScheduleOption = memo(function ScheduleOption() {
  const toggle = useToggle('scheduleEnabled', 'Schedule activation')
  return (
    <OptionRow
      title="Schedule"
      description="Publish the link later instead of right away."
      toggle={toggle}
    >
      <DraftDateTimeInput
        field="activateAt"
        label="Starts at"
        description="Before this, visitors go to the fallback URL if you set one."
        width="100%"
      />
    </OptionRow>
  )
})

const ExpiryOption = memo(function ExpiryOption() {
  const toggle = useToggle('expiryEnabled', 'Set an expiration date')
  // Expiry can't come before a scheduled start.
  const scheduledStart = useDraftSelect((d) =>
    d.scheduleEnabled && d.activateAt ? d.activateAt : undefined,
  )
  return (
    <OptionRow
      hasDivider
      title="Expiration"
      description="Stop the link at a set time."
      toggle={toggle}
    >
      <DraftDateTimeInput
        field="expiresAt"
        label="Expires at"
        min={scheduledStart as ISODateTimeString | undefined}
        width="100%"
      />
    </OptionRow>
  )
})

const MaxClicksInput = memo(function MaxClicksInput() {
  const { set } = useLinkForm()
  const value = useDraftValue('maxClicks')
  const status = useFieldStatus('maxClicks')
  const onChange = useCallback((next: number | null) => set('maxClicks', next), [set])
  return (
    <NumberInput
      label="Maximum clicks"
      placeholder="1000"
      value={value}
      onChange={onChange}
      min={1}
      step={1}
      isIntegerOnly
      hasClear
      units="clicks"
      status={status}
      width="100%"
    />
  )
})

const ClickLimitOption = memo(function ClickLimitOption() {
  const toggle = useToggle('clickLimitEnabled', 'Limit clicks')
  return (
    <OptionRow
      hasDivider
      title="Click limit"
      description="Expire after a number of clicks — handy for giveaways and one-time offers."
      toggle={toggle}
    >
      <MaxClicksInput />
    </OptionRow>
  )
})

const ExpiredDestination = memo(function ExpiredDestination() {
  const hasExpiryRule = useDraftSelect((d) => d.expiryEnabled || d.clickLimitEnabled)
  if (!hasExpiryRule) return null
  return (
    <DraftTextInput
      field="expiredDestination"
      type="url"
      label="After it expires, send visitors to"
      description="Leave blank to show an “expired” page."
      placeholder="https://example.com/offer-ended"
      isOptional
      width="100%"
    />
  )
})

export const AvailabilitySection = memo(function AvailabilitySection() {
  return (
    <FormSection
      title="Availability"
      description="Control when the link works and when it stops."
    >
      <ScheduleOption />
      <ExpiryOption />
      <ClickLimitOption />
      <ExpiredDestination />
    </FormSection>
  )
})

/* ------------------------------- Advanced ------------------------------- */

type MetadataItemProps = {
  row: MetadataRow
  onChange: (id: string, patch: Partial<MetadataRow>) => void
  onRemove: (id: string) => void
}

const MetadataItem = memo(function MetadataItem({
  row,
  onChange,
  onRemove,
}: MetadataItemProps) {
  return (
    <HStack gap={2} vAlign="start" width="100%">
      <div style={{ flex: 1, minWidth: 0 }}>
        <TextInput
          label="Key"
          isLabelHidden
          placeholder="owner"
          value={row.key}
          onChange={(value) => onChange(row.id, { key: value })}
          width="100%"
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <TextInput
          label={`Value for ${row.key || 'field'}`}
          isLabelHidden
          placeholder="growth-team"
          value={row.value}
          onChange={(value) => onChange(row.id, { value })}
          width="100%"
        />
      </div>
      <IconButton
        variant="ghost"
        label={`Remove ${row.key || 'field'}`}
        icon={<span aria-hidden>×</span>}
        onClick={() => onRemove(row.id)}
      />
    </HStack>
  )
})

const MetadataEditor = memo(function MetadataEditor() {
  const { form, set } = useLinkForm()
  const rows = useDraftValue('metadata')
  const error = useFieldError('metadata')

  const onChange = useCallback(
    (id: string, patch: Partial<MetadataRow>) =>
      set(
        'metadata',
        form.state.values.metadata.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      ),
    [form, set],
  )
  const onRemove = useCallback(
    (id: string) =>
      set(
        'metadata',
        form.state.values.metadata.filter((r) => r.id !== id),
      ),
    [form, set],
  )
  const onAdd = useCallback(
    () =>
      set('metadata', [
        ...form.state.values.metadata,
        { id: rowId('meta'), key: '', value: '' },
      ]),
    [form, set],
  )

  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      <VStack gap={1}>
        <Text weight="semibold">Custom metadata</Text>
        <Text type="supporting" color="secondary">
          Key–value pairs stored with the link (e.g. owner, cost center).
        </Text>
      </VStack>
      {rows.map((row) => (
        <MetadataItem key={row.id} row={row} onChange={onChange} onRemove={onRemove} />
      ))}
      {error ? (
        <Text type="supporting" style={{ color: 'var(--color-text-error, inherit)' }}>
          {error}
        </Text>
      ) : null}
      <HStack>
        <Button variant="secondary" size="sm" label="Add field" onClick={onAdd} />
      </HStack>
    </VStack>
  )
})

export const AdvancedSection = memo(function AdvancedSection() {
  return (
    <FormSection
      title="Advanced"
      description="Fallbacks and data for your own integrations."
    >
      <DraftTextInput
        field="fallbackDestination"
        type="url"
        label="Fallback URL"
        description="Where visitors go when the link isn’t serving — before it starts, or while it’s paused."
        placeholder="https://example.com"
        isOptional
        width="100%"
      />
      <MetadataEditor />
    </FormSection>
  )
})
