import { useState } from 'react'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import ThemePreviewCard, { type ThemePreviewMode } from '#/components/settings/ThemePreviewCard'

const MODES: { mode: ThemePreviewMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
]

export default function AppearanceSettingsFields() {
  const [prototypeSelection, setPrototypeSelection] = useState<ThemePreviewMode>('system')

  return (
    <VStack paddingBlockStart={3} hAlign="start" width="fill">
      <HStack
        gap={4}
        vAlign="start"
        wrap="wrap"
        role="radiogroup"
        aria-label="Color mode"
      >
        {MODES.map(({ mode, label }) => (
          <ThemePreviewCard
            key={mode}
            mode={mode}
            label={label}
            isSelected={prototypeSelection === mode}
            onSelect={() => setPrototypeSelection(mode)}
          />
        ))}
      </HStack>
    </VStack>
  )
}
