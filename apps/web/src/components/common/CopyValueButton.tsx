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
      className="ol-copy-value"
      // Room and rounded corners for the focus ring; negative margins keep the text in place.
      style={{ display: 'inline-block', padding: '2px 6px', margin: '-2px -6px', borderRadius: 'var(--radius-element)' }}
      tooltip={isCopied ? 'Copied' : 'Click to copy'}
      onClick={() => void copy(copyValue)}
    >
      {display}
    </Link>
  )
}
