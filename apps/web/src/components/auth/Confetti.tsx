import { useEffect, useMemo, useState } from 'react'

const COLORS = ['#FF6A1A', '#0061FE', '#4ade80', '#facc15', '#f472b6', '#a78bfa']
const PIECES = 90

type Piece = {
  left: number
  delay: number
  duration: number
  drift: number
  spin: number
  size: number
  color: string
  round: boolean
}

// Plain CSS keyframes (no dependency). Pieces start above the viewport and fall past the bottom.
const KEYFRAMES = `
@keyframes ol-confetti-fall {
  0% { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translate3d(var(--drift), 112vh, 0) rotate(var(--spin)); opacity: 0; }
}`

/**
 * One-shot confetti that rains from the top of the page. Renders nothing on
 * the server, and nothing at all for people who prefer reduced motion.
 */
export default function Confetti({ pieces = PIECES }: { pieces?: number }) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    setActive(true)
    const timer = window.setTimeout(() => setActive(false), 6500)
    return () => window.clearTimeout(timer)
  }, [])

  const items = useMemo<Piece[]>(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 3 + Math.random() * 2.5,
        drift: (Math.random() - 0.5) * 240,
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720),
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.3,
      })),
    [pieces],
  )

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 50 }}
    >
      <style>{KEYFRAMES}</style>
      {items.map((p, i) => (
        <span
          key={i}
          style={
            {
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              borderRadius: p.round ? '50%' : 2,
              backgroundColor: p.color,
              opacity: 0,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
              animation: `ol-confetti-fall ${p.duration}s cubic-bezier(0.25, 0.6, 0.45, 1) ${p.delay}s 1 both`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
