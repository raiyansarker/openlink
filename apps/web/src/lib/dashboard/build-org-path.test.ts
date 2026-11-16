import { describe, expect, test } from 'bun:test'

import { WorkspaceUrl, type DashboardSection } from './build-org-path'

describe('WorkspaceUrl.build', () => {
  test('uses the /w prefix for the overview and every section', () => {
    expect(WorkspaceUrl.build('acme')).toBe('/w/acme')
    const expected: Record<DashboardSection, string> = {
      overview: '/w/acme',
      activity: '/w/acme/activity',
      notifications: '/w/acme/notifications',
      links: '/w/acme/links',
      analytics: '/w/acme/analytics',
      domains: '/w/acme/domains',
      settings: '/w/acme/settings',
    }
    for (const [section, path] of Object.entries(expected)) {
      expect(WorkspaceUrl.build('acme', section as DashboardSection)).toBe(path)
    }
  })
})

describe('WorkspaceUrl.sectionOf', () => {
  test('reads the section back from a pathname', () => {
    expect(WorkspaceUrl.sectionOf('/w/acme', 'acme')).toBe('overview')
    expect(WorkspaceUrl.sectionOf('/w/acme/', 'acme')).toBe('overview')
    expect(WorkspaceUrl.sectionOf('/w/acme/links/abc', 'acme')).toBe('links')
    expect(WorkspaceUrl.sectionOf('/w/acme/domains/new', 'acme')).toBe('domains')
    expect(WorkspaceUrl.sectionOf('/w/acme/analytics', 'acme')).toBe('analytics')
  })

  test('only reads sections of the given workspace', () => {
    expect(WorkspaceUrl.sectionOf('/w/other/links', 'acme')).toBe('overview')
    expect(WorkspaceUrl.sectionOf('/dashboard/acme/links', 'acme')).toBe('overview')
  })
})

describe('WorkspaceUrl.replaceOrg', () => {
  test('keeps the section when switching workspace', () => {
    expect(WorkspaceUrl.replaceOrg('/w/acme/links/abc', 'other')).toBe('/w/other/links/abc')
    expect(WorkspaceUrl.replaceOrg('/w/acme', 'other')).toBe('/w/other')
  })

  test('falls back to the workspace overview outside a workspace', () => {
    expect(WorkspaceUrl.replaceOrg('/settings/profile', 'other')).toBe('/w/other')
    expect(WorkspaceUrl.replaceOrg('/create/link', 'other')).toBe('/w/other')
  })
})

describe('WorkspaceUrl.fromLegacy', () => {
  test.each([
    ['/dashboard', '/w'],
    ['/dashboard/', '/w'],
    ['/dashboard/acme', '/w/acme'],
    ['/dashboard/acme/', '/w/acme/'],
    ['/dashboard/acme/links/abc?tab=history#top', '/w/acme/links/abc?tab=history#top'],
    ['/dashboard/acme/settings/members', '/w/acme/settings/members'],
    ['/dashboard?x=1', '/w?x=1'],
    ['/dashboard/?x=1', '/w?x=1'],
    ['/dashboard#frag', '/w#frag'],
    ['/dashboard/links', '/w?section=links'],
    ['/dashboard/links/', '/w?section=links'],
    ['/dashboard/analytics?x=1', '/w?section=analytics'],
    ['/dashboard/settings', '/settings/profile'],
    ['/dashboard/linksx', '/w/linksx'],
    ['/dashboard/links/abc', '/w/links/abc'],
  ])('%s -> %s', (legacy, expected) => {
    expect(WorkspaceUrl.fromLegacy(legacy)).toBe(expected)
  })

  test.each(['/w/acme', '/dashboardx', '/dashboard-old/acme', '/settings', '/', 'dashboard/acme', 'https://evil.example/dashboard'])(
    'does not touch %s',
    (href) => {
      expect(WorkspaceUrl.fromLegacy(href)).toBeNull()
    },
  )

  test('can never produce an off-site or protocol-relative target', () => {
    for (const href of ['/dashboard//evil.example', '/dashboard/\\evil.example', '/dashboard///x']) {
      const target = WorkspaceUrl.fromLegacy(href)!
      expect(target.startsWith('/w')).toBe(true)
      expect(target.startsWith('//')).toBe(false)
    }
  })
})
