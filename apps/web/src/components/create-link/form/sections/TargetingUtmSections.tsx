import { memo, useCallback, useMemo } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { HStack } from '@astryxdesign/core/HStack'
import { IconButton } from '@astryxdesign/core/IconButton'
import { Selector } from '@astryxdesign/core/Selector'
import { Text } from '@astryxdesign/core/Text'
import { TextInput } from '@astryxdesign/core/TextInput'
import { VStack } from '@astryxdesign/core/VStack'
import FormSection, { FieldRow } from '#/components/create-link/FormSection'
import { countryFlag, countryName, getCountries } from '#/lib/links/countries'
import {
  cleanUtm,
  readUtmFromUrl,
  type GeoRuleRow,
  type UtmKey,
} from '#/lib/links/create-link'
import { DraftTextInput } from '#/components/create-link/form/fields'
import {
  useDraftSelect,
  useDraftValue,
  useFieldError,
  useLinkForm,
} from '#/components/create-link/form/LinkFormContext'
import { rowId, utmFinalUrlOf } from '#/components/create-link/form/derive'

let countryCache: ReturnType<typeof getCountries> | null = null
function allCountries() {
  countryCache ??= getCountries()
  return countryCache
}

type GeoRuleItemProps = {
  row: GeoRuleRow
  /** Countries already chosen by the other rows (comma-joined, so memo can compare it). */
  taken: string
  onChange: (id: string, patch: Partial<GeoRuleRow>) => void
  onRemove: (id: string) => void
}

const GeoRuleItem = memo(function GeoRuleItem({
  row,
  taken,
  onChange,
  onRemove,
}: GeoRuleItemProps) {
  const options = useMemo(() => {
    const usedElsewhere = new Set(taken ? taken.split(',') : [])
    return allCountries().map((c) => ({
      value: c.code,
      label: `${countryFlag(c.code)}  ${c.name}`,
      disabled: usedElsewhere.has(c.code),
    }))
  }, [taken])

  return (
    <HStack gap={2} vAlign="start" width="100%">
      <div style={{ flex: '0 0 40%', minWidth: 0 }}>
        <Selector
          label="Country"
          isLabelHidden
          placeholder="Choose a country"
          options={options}
          value={row.country || undefined}
          onChange={(value) => onChange(row.id, { country: value })}
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
          onChange={(value) => onChange(row.id, { url: value })}
          width="100%"
        />
      </div>
      <IconButton
        variant="ghost"
        label="Remove country rule"
        icon={<span aria-hidden>×</span>}
        onClick={() => onRemove(row.id)}
      />
    </HStack>
  )
})

const GeoRules = memo(function GeoRules() {
  const { form, set } = useLinkForm()
  const rows = useDraftValue('geoRules')
  const error = useFieldError('geoRules')

  const onChange = useCallback(
    (id: string, patch: Partial<GeoRuleRow>) =>
      set(
        'geoRules',
        form.state.values.geoRules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      ),
    [form, set],
  )
  const onRemove = useCallback(
    (id: string) =>
      set(
        'geoRules',
        form.state.values.geoRules.filter((r) => r.id !== id),
      ),
    [form, set],
  )
  const onAdd = useCallback(
    () =>
      set('geoRules', [
        ...form.state.values.geoRules,
        { id: rowId('geo'), country: '', url: '' },
      ]),
    [form, set],
  )

  return (
    <VStack gap={3} hAlign="stretch" width="100%">
      <VStack gap={1}>
        <Text weight="semibold">Countries</Text>
        <Text type="supporting" color="secondary">
          Device rules are checked first, then the visitor’s country.
        </Text>
      </VStack>
      {rows.map((row) => (
        <GeoRuleItem
          key={row.id}
          row={row}
          taken={rows
            .filter((r) => r.id !== row.id && r.country)
            .map((r) => r.country)
            .sort()
            .join(',')}
          onChange={onChange}
          onRemove={onRemove}
        />
      ))}
      {error ? (
        <Text type="supporting" style={{ color: 'var(--color-text-error, inherit)' }}>
          {error}
        </Text>
      ) : null}
      <HStack>
        <Button variant="secondary" size="sm" label="Add country" onClick={onAdd} />
      </HStack>
    </VStack>
  )
})

export const TargetingSection = memo(function TargetingSection() {
  const { patch } = useLinkForm()
  const enabled = useDraftValue('targetingEnabled')
  const toggle = useMemo(
    () => ({
      label: 'Enable targeting',
      value: enabled,
      onChange: (on: boolean) =>
        patch((prev) => ({
          targetingEnabled: on,
          // Start with one empty country row so the list isn't blank.
          geoRules:
            on && prev.geoRules.length === 0
              ? [{ id: rowId('geo'), country: '', url: '' }]
              : prev.geoRules,
        })),
    }),
    [enabled, patch],
  )
  return (
    <FormSection
      title="Targeting"
      description="Send people to a different destination based on their device or country. Everyone else goes to the main destination."
      toggle={toggle}
    >
      <FieldRow>
        <DraftTextInput
          field="iosUrl"
          type="url"
          label="iOS destination"
          description="iPhone and iPad visitors."
          placeholder="https://apps.apple.com/app/…"
          showFavicon
          isOptional
          width="100%"
        />
        <DraftTextInput
          field="androidUrl"
          type="url"
          label="Android destination"
          description="Android phones and tablets."
          placeholder="https://play.google.com/store/apps/…"
          showFavicon
          isOptional
          width="100%"
        />
      </FieldRow>
      <GeoRules />
    </FormSection>
  )
})

const UTM_FIELDS: { key: UtmKey; label: string; placeholder: string }[] = [
  { key: 'source', label: 'Source', placeholder: 'newsletter' },
  { key: 'medium', label: 'Medium', placeholder: 'email' },
  { key: 'campaign', label: 'Campaign', placeholder: 'spring_launch' },
  { key: 'term', label: 'Term', placeholder: 'running+shoes' },
  { key: 'content', label: 'Content', placeholder: 'hero_button' },
]

const UtmInput = memo(function UtmInput({
  field,
}: {
  field: (typeof UTM_FIELDS)[number]
}) {
  const { form, set } = useLinkForm()
  const value = useDraftSelect((d) => d.utm[field.key] ?? '')
  const onChange = useCallback(
    (next: string) => set('utm', { ...form.state.values.utm, [field.key]: next }),
    [form, set, field.key],
  )
  return (
    <TextInput
      label={field.label}
      placeholder={field.placeholder}
      value={value}
      onChange={onChange}
      width="100%"
    />
  )
})

/** The destination with UTM applied; only mounted while UTM is on. */
const UtmFinalUrl = memo(function UtmFinalUrl() {
  const finalUrl = useDraftSelect(utmFinalUrlOf)
  if (!finalUrl) return null
  return (
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
        {finalUrl}
      </Text>
    </VStack>
  )
})

export const UtmSection = memo(function UtmSection() {
  const { patch } = useLinkForm()
  const enabled = useDraftValue('utmEnabled')
  const toggle = useMemo(
    () => ({
      label: 'Add UTM parameters',
      value: enabled,
      onChange: (on: boolean) => {
        // Turning UTM on pulls in any utm_* params already in the URL.
        patch((prev) =>
          on && !cleanUtm(prev.utm)
            ? { utmEnabled: true, utm: readUtmFromUrl(prev.destination) }
            : { utmEnabled: on },
        )
      },
    }),
    [enabled, patch],
  )
  return (
    <FormSection
      title="UTM parameters"
      description="Tag traffic for Google Analytics and other tools. Added to the destination when the link opens."
      toggle={toggle}
    >
      <FieldRow>
        {UTM_FIELDS.map((field) => (
          <UtmInput key={field.key} field={field} />
        ))}
      </FieldRow>
      <UtmFinalUrl />
    </FormSection>
  )
})
