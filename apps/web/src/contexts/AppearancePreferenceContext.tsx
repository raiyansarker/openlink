import { use$ } from '@legendapp/state/react'
import { appearance$ } from '#/state/appearance.state'
import type { ColorMode } from '#/lib/settings/appearance-preference'

export function useAppearancePreference() {
  const colorMode = use$(appearance$.colorMode)
  const setColorMode = (mode: ColorMode) => {
    appearance$.colorMode.set(mode)
  }
  return { colorMode, setColorMode }
}
