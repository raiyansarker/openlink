import { useEffect, useState } from 'react'
import { LinkIcon } from '#/components/icons/IcnMcp'
import { faviconUrl } from '#/lib/links/favicon'

type FaviconProps = {
  /** Destination URL; falls back to a link icon when empty or invalid. */
  url: string
  size?: number
}

/** Destination site icon (Google favicon service), with a neutral fallback. */
export default function Favicon({ url, size = 16 }: FaviconProps) {
  const src = url ? faviconUrl(url, size * 2) : null
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])

  if (!src || failed) {
    return (
      <span
        style={{
          display: 'inline-flex',
          flexShrink: 0,
          color: 'var(--color-text-secondary)',
        }}
      >
        <LinkIcon size={size} />
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ display: 'block', flexShrink: 0, borderRadius: 3 }}
    />
  )
}
