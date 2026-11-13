import type { ReactNode } from 'react'
import { Heading } from '@astryxdesign/core/Heading'
import { HStack } from '@astryxdesign/core/HStack'
import { Switch } from '@astryxdesign/core/Switch'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'

type Toggle = {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

type FormSectionProps = {
  title: string
  description?: ReactNode
  /**
   * Adds an on/off switch to the header; the body only renders while it is on
   * (for optional features).
   */
  toggle?: Toggle
  children?: ReactNode
}

function HeaderText({
  title,
  description,
  level,
}: {
  title: string
  description?: ReactNode
  level: 4 | 5
}) {
  return (
    <VStack gap={1} style={{ flex: 1, minWidth: 0 }}>
      {level === 4 ? (
        <Heading level={4}>{title}</Heading>
      ) : (
        // Sub-options inside a card: body-size, semibold — smaller headings
        // read as captions next to the card title.
        <Text weight="semibold">{title}</Text>
      )}
      {description ? (
        <Text type="supporting" color="secondary">
          {description}
        </Text>
      ) : null}
    </VStack>
  )
}

/** One block of the create-link form, separated from the next by whitespace. */
export default function FormSection({
  title,
  description,
  toggle,
  children,
}: FormSectionProps) {
  const isOpen = toggle ? toggle.value : true
  return (
    <section
      className="ol-form-section"
      style={{
        width: '100%',
        // Sections are separated by space, not rules.
        padding: '0 0 48px',
      }}
    >
      <VStack gap={5} hAlign="stretch" width="100%">
        <HStack gap={4} hAlign="between" vAlign="start" width="100%">
          <HeaderText title={title} description={description} level={4} />
          {toggle ? (
            <Switch
              label={toggle.label}
              isLabelHidden
              value={toggle.value}
              onChange={toggle.onChange}
            />
          ) : null}
        </HStack>
        {isOpen && children ? (
          <VStack gap={5} hAlign="stretch" width="100%">
            {children}
          </VStack>
        ) : null}
      </VStack>
    </section>
  )
}

type OptionRowProps = {
  title: string
  description?: ReactNode
  toggle: Toggle
  children?: ReactNode
  /** Extra space above the row (all but the first row in a section). */
  hasDivider?: boolean
}

/** A switchable option inside a FormSection; reveals its fields when on. */
export function OptionRow({
  title,
  description,
  toggle,
  children,
  hasDivider,
}: OptionRowProps) {
  return (
    <VStack
      gap={4}
      hAlign="stretch"
      width="100%"
      style={hasDivider ? { paddingTop: 12 } : undefined}
    >
      <HStack gap={4} hAlign="between" vAlign="start" width="100%">
        <HeaderText title={title} description={description} level={5} />
        <Switch
          label={toggle.label}
          isLabelHidden
          value={toggle.value}
          onChange={toggle.onChange}
        />
      </HStack>
      {toggle.value && children ? (
        <VStack gap={4} hAlign="stretch" width="100%">
          {children}
        </VStack>
      ) : null}
    </VStack>
  )
}

/** Two equal columns that stack on narrow widths. */
export function FieldRow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        width: '100%',
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  )
}

/** A field with a live "n / max" counter under its end edge. */
export function WithCounter({
  count,
  max,
  children,
}: {
  count: number
  max: number
  children: ReactNode
}) {
  return (
    <VStack gap={1} hAlign="stretch" width="100%">
      {children}
      <Text
        type="supporting"
        color="secondary"
        style={{
          alignSelf: 'flex-end',
          fontVariantNumeric: 'tabular-nums',
          color: count > max ? 'var(--color-text-error, inherit)' : undefined,
        }}
      >
        {count} / {max}
      </Text>
    </VStack>
  )
}
