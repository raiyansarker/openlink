import { Link } from '@astryxdesign/core/Link'
import { useClipboard } from '@astryxdesign/core/hooks'

type CopyValueButtonProps = {
  /** Text shown inline. */
  display: string
  /** Text placed on the clipboard (defaults to `display`). */
  copyValue?: string
}

/**
 * Inline value that copies itself when clicked. Link with no href renders a
 * native button, so it stays keyboard accessible while its text lines up flush
 * with surrounding labels (a ghost Button adds padding).
 */
export default function CopyValueButton({
  display,
  copyValue = display,
}: CopyValueButtonProps) {
  const { copy, isCopied } = useClipboard()

  return (
    <Link
      color="primary"
      tooltip={isCopied ? 'Copied' : 'Click to copy'}
      onClick={() => void copy(copyValue)}
    >
      {display}
    </Link>
  )
}
