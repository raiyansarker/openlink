import { Spinner } from '@astryxdesign/core/Spinner'
import { VStack } from '@astryxdesign/core/VStack'

type SettingsLoadingProps = {
  label: string
  /** `panel` fills the settings content area; `section` sits under a heading that is already shown. */
  size?: 'panel' | 'section'
}

/** A spinner centered in the space the content will take, instead of tucked into a corner. */
export default function SettingsLoading({ label, size = 'panel' }: SettingsLoadingProps) {
  return (
    <VStack
      hAlign="center"
      vAlign="center"
      width="100%"
      style={{ minHeight: size === 'panel' ? 320 : 160 }}
    >
      <Spinner size="lg" label={label} />
    </VStack>
  )
}
