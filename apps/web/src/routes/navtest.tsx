import { createFileRoute } from '@tanstack/react-router'
import { VStack } from '@astryxdesign/core/VStack'
import {
  ActivityIcon,
  BarChartIcon,
  ChevronDownIcon,
  DashboardIcon,
  GlobeIcon,
  LinkIcon,
  PlusIcon,
} from '#/components/icons/IcnMcp'

/**
 * TEMPORARY DIAGNOSTIC PAGE — mobile nav repro, no auth required.
 *
 * A byte-for-byte copy of the tab bar in MobileDashboardShell (constants,
 * inline styles, pill, spans, data-nav-build marker). It exists so the bar
 * can be compared across devices without the dev session:
 *
 *   https://<host>/__navtest
 *
 * If labels render here but not in the dashboard on the same phone, the
 * divergence is in the dashboard shell path, not this markup. If they are
 * missing here too, the markup itself fails on that renderer. Delete this
 * route once the investigation closes.
 */

const NAV_SURFACE_STYLE = {
  backgroundColor: 'var(--color-background-surface)',
  border: '1px solid var(--color-border)',
  boxShadow: '0 10px 24px rgba(0, 0, 0, 0.12)',
} as const

const TAB_SLOT_PX = 52
const CAPSULE_PAD_PX = 5
const PLUS_CIRCLE_PX = 54
const BRAND = 'var(--openlink-brand)'
const NAV_TEXT_PRIMARY = 'var(--color-text-primary)'
const PILL_BG = 'var(--color-overlay-pressed)'

const TABS = [
  { id: 'overview', label: 'Home', icon: <DashboardIcon size={22} strokeWidth={1.6} style={{ flexShrink: 0 }} /> },
  { id: 'activity', label: 'Activity', icon: <ActivityIcon size={22} strokeWidth={1.6} style={{ flexShrink: 0 }} /> },
  { id: 'links', label: 'Links', icon: <LinkIcon size={22} strokeWidth={1.6} style={{ flexShrink: 0 }} /> },
  { id: 'domains', label: 'Domains', icon: <GlobeIcon size={22} strokeWidth={1.6} style={{ flexShrink: 0 }} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChartIcon size={22} strokeWidth={1.6} style={{ flexShrink: 0 }} /> },
] as const

function NavTest() {
  const activeTabIndex = 1
  return (
    <VStack
      gap={0}
      hAlign="stretch"
      width="100%"
      height="100dvh"
      style={{
        overflow: 'hidden',
        backgroundColor: 'var(--color-background-surface)',
        position: 'relative',
      }}
    >
      {/* Fake page content behind the bar, so contrast is judgeable. */}
      <div style={{ flex: 1, padding: 24, color: NAV_TEXT_PRIMARY }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Nav diagnostic page</p>
        <p style={{ opacity: 0.7 }}>
          Slot 2 (Activity) is active. You should see five icons, each with an 11px
          text label under it, in a solid bar docked at the bottom.
        </p>
        <p style={{ opacity: 0.4 }}>data-nav-build: solid-v2-labels</p>
      </div>

      {/* --- BEGIN exact copy of the shell's floating nav --- */}
      <div
        data-nav-build="solid-v2-labels"
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 'calc(12px + env(safe-area-inset-bottom))',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <nav
          aria-label="Sections"
          style={{
            ...NAV_SURFACE_STYLE,
            position: 'relative',
            display: 'flex',
            flexDirection: 'row',
            padding: CAPSULE_PAD_PX,
            borderRadius: 999,
            pointerEvents: 'auto',
          }}
        >
          {activeTabIndex >= 0 ? (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: CAPSULE_PAD_PX,
                bottom: CAPSULE_PAD_PX,
                left: `${CAPSULE_PAD_PX + TAB_SLOT_PX * activeTabIndex}px`,
                width: TAB_SLOT_PX,
                borderRadius: 999,
                backgroundColor: PILL_BG,
                transition: 'left 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            />
          ) : null}
          {TABS.map((tab, index) => {
            const isActive = index === activeTabIndex
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                style={{
                  width: TAB_SLOT_PX,
                  height: 48,
                  border: 'none',
                  padding: '4px 1px',
                  boxSizing: 'border-box',
                  borderRadius: 999,
                  position: 'relative',
                  background: 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  color: isActive ? BRAND : NAV_TEXT_PRIMARY,
                  transition: 'color 0.22s ease',
                }}
              >
                {tab.icon}
                <span
                  style={{
                    fontSize: 11,
                    lineHeight: '13px',
                    fontWeight: isActive ? 600 : 500,
                    color: 'inherit',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>

        <button
          type="button"
          aria-label="Create link"
          style={{
            ...NAV_SURFACE_STYLE,
            flexShrink: 0,
            width: PLUS_CIRCLE_PX,
            height: PLUS_CIRCLE_PX,
            padding: 0,
            borderRadius: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: NAV_TEXT_PRIMARY,
            pointerEvents: 'auto',
          }}
        >
          <PlusIcon size={22} strokeWidth={1.8} />
        </button>
      </div>
      {/* --- END exact copy --- */}
    </VStack>
  )

  // Silence the unused-icon lint in this throwaway page (ChevronDown kept
  // only if header replication is added later).
  void ChevronDownIcon
}

export const Route = createFileRoute('/navtest')({
  component: NavTest,
})
