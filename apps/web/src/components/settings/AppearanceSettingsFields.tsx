import { Grid } from '@astryxdesign/core/Grid'
import { HStack } from '@astryxdesign/core/HStack'
import { VStack } from '@astryxdesign/core/VStack'
import { useIsPhone } from '#/hooks/use-is-phone'
import ThemePreviewCard, { type ThemePreviewMode } from '#/components/settings/ThemePreviewCard'
import { useAppearancePreference } from '#/contexts/AppearancePreferenceContext'

const MODES: { mode: ThemePreviewMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
]

export default function AppearanceSettingsFields() {
  const { colorMode, setColorMode } = useAppearancePreference()
  // Phones: one full-width card per row instead of a cramped 2+1 wrap.
  const isPhone = useIsPhone()

  const cards = MODES.map(({ mode, label }) => (
    <ThemePreviewCard
      key={mode}
      mode={mode}
      label={label}
      isSelected={colorMode === mode}
      onSelect={() => setColorMode(mode)}
      // Fills the row's width so the art stretches with the phone screen.
      fill={isPhone}
    />
  ))

  return (
    <VStack paddingBlockStart={3} hAlign="start" width="fill">
      {isPhone ? (
        /* Three-up: equal thirds filling the screen, one visual row. */
        <Grid columns={3} gap={2} width="fill" role="radiogroup" aria-label="Color mode">
          {cards}
        </Grid>
      ) : (
        <HStack
          gap={4}
          vAlign="start"
          wrap="wrap"
          role="radiogroup"
          aria-label="Color mode"
        >
          {cards}
        </HStack>
      )}
    </VStack>
  )
}
