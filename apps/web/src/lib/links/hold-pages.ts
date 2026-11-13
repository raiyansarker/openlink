import type { HoldPage } from '#/data/demo/types'

export type HoldPageMeta = {
  page: HoldPage
  /** Short name in pickers. */
  label: string
  /** HTTP status the page is served with. */
  status: number
  /** What a visitor sees as the page heading. */
  heading: string
  /** Footer line under the rule (nginx-style pages). */
  footer?: string
  /** Friendly pages get body copy instead of the bare server look. */
  body?: string
  /** Whether it looks like a raw web-server error. */
  isServerStyle: boolean
}

export const HOLD_PAGES: HoldPageMeta[] = [
  {
    page: 'bad-gateway',
    label: '502 Bad Gateway',
    status: 502,
    heading: '502 Bad Gateway',
    footer: 'nginx',
    isServerStyle: true,
  },
  {
    page: 'service-unavailable',
    label: '503 Unavailable',
    status: 503,
    heading: '503 Service Temporarily Unavailable',
    footer: 'nginx',
    isServerStyle: true,
  },
  {
    page: 'gateway-timeout',
    label: '504 Timeout',
    status: 504,
    heading: '504 Gateway Time-out',
    footer: 'nginx',
    isServerStyle: true,
  },
  {
    page: 'maintenance',
    label: 'Maintenance',
    status: 503,
    heading: 'We’ll be right back',
    body: 'This page is down for scheduled maintenance. Please try again in a little while.',
    isServerStyle: false,
  },
]

export function holdPageMeta(page: HoldPage): HoldPageMeta {
  return HOLD_PAGES.find((p) => p.page === page) ?? HOLD_PAGES[0]!
}
