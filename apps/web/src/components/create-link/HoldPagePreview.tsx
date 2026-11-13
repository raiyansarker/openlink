import { holdPageMeta } from '#/lib/links/hold-pages'
import type { HoldPage } from '#/data/demo/types'

type HoldPagePreviewProps = {
  page: HoldPage
  /** Address shown in the fake browser bar. */
  url: string
  /** Shrinks the type for picker thumbnails. */
  isCompact?: boolean
}

const SERIF = '"Times New Roman", Times, serif'
const SANS =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

/**
 * Pixel-faithful mock of what visitors see while a link is on hold. Always
 * light (real server error pages ignore dark mode).
 */
export default function HoldPagePreview({
  page,
  url,
  isCompact = false,
}: HoldPagePreviewProps) {
  const meta = holdPageMeta(page)
  const scale = isCompact ? 0.5 : 1

  return (
    <div
      aria-hidden="true"
      style={{
        width: '100%',
        borderRadius: isCompact ? 6 : 10,
        overflow: 'hidden',
        border: '1px solid #dcdcdc',
        background: '#fff',
        color: '#000',
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6 * scale,
          padding: `${7 * scale}px ${10 * scale}px`,
          background: '#f1f1f1',
          borderBottom: '1px solid #e2e2e2',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 8 * scale,
              height: 8 * scale,
              borderRadius: '50%',
              background: '#cfcfcf',
              flexShrink: 0,
            }}
          />
        ))}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            marginLeft: 6 * scale,
            padding: `${2 * scale}px ${8 * scale}px`,
            borderRadius: 999,
            background: '#fff',
            fontFamily: SANS,
            fontSize: Math.max(8, 11 * scale),
            color: '#555',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {url}
        </span>
      </div>

      {/* Page */}
      {meta.isServerStyle ? (
        <div
          style={{
            padding: `${22 * scale}px ${16 * scale}px ${18 * scale}px`,
            fontFamily: SERIF,
            textAlign: 'center',
            minHeight: isCompact ? 64 : 150,
          }}
        >
          <div style={{ fontSize: Math.max(9, 26 * scale), fontWeight: 700 }}>
            {meta.heading}
          </div>
          <hr
            style={{
              margin: `${12 * scale}px 0 ${6 * scale}px`,
              border: 0,
              borderTop: '1px solid #aaa',
            }}
          />
          <div style={{ fontSize: Math.max(8, 15 * scale) }}>{meta.footer}</div>
        </div>
      ) : (
        <div
          style={{
            padding: `${26 * scale}px ${16 * scale}px`,
            fontFamily: SANS,
            textAlign: 'center',
            minHeight: isCompact ? 64 : 150,
          }}
        >
          <div
            style={{
              fontSize: Math.max(9, 22 * scale),
              fontWeight: 650,
              letterSpacing: '-0.01em',
            }}
          >
            {meta.heading}
          </div>
          {!isCompact ? (
            <div
              style={{
                margin: '10px auto 0',
                maxWidth: 320,
                fontSize: 14,
                lineHeight: 1.5,
                color: '#555',
              }}
            >
              {meta.body}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
