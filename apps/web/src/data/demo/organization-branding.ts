/** Visual identity per org for the icon rail (demo only). */
export type OrganizationBrand = {
  glyph: string
  accent: string
  accentMuted: string
}

export const organizationBranding: Record<string, OrganizationBrand> = {
  org_openlink: {
    glyph: '◈',
    accent: '#14b8a6',
    accentMuted: 'color-mix(in oklab, #14b8a6 22%, transparent)',
  },
  org_acme: {
    glyph: '▣',
    accent: '#6366f1',
    accentMuted: 'color-mix(in oklab, #6366f1 22%, transparent)',
  },
  org_devrel: {
    glyph: '◎',
    accent: '#f97316',
    accentMuted: 'color-mix(in oklab, #f97316 22%, transparent)',
  },
}

export function getOrganizationBrand(orgId: string): OrganizationBrand {
  return (
    organizationBranding[orgId] ?? {
      glyph: '◇',
      accent: '#64748b',
      accentMuted: 'color-mix(in oklab, #64748b 22%, transparent)',
    }
  )
}
