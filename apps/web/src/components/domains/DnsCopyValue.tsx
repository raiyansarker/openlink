import { Button } from '@astryxdesign/core/Button'
import { useClipboard } from '@astryxdesign/core/hooks'

type DnsCopyValueProps = {
  /** Text shown on the button. */
  display: string
  /** Text placed on the clipboard (defaults to `display`). */
  copyValue?: string
}

/** Value that copies itself to the clipboard when clicked. */
export default function DnsCopyValue({
  display,
  copyValue = display,
}: DnsCopyValueProps) {
  const { copy, isCopied } = useClipboard()

  return (
    <Button
      variant="ghost"
      size="sm"
      label={isCopied ? 'Copied' : display}
      tooltip="Click to copy"
      onClick={() => void copy(copyValue)}
    />
  )
}
