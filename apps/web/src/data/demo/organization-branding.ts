/** Visual identity per org for the icon rail (demo only). */
export type OrganizationBrandIconKey = 'x' | 'github' | 'dribbble' | 'fallback'

export type OrganizationBrand = {
  icon: OrganizationBrandIconKey
  accent: string
  accentMuted: string
}

export const organizationBranding: Record<string, OrganizationBrand> = {
  org_x: {
    icon: 'x',
    accent: '#000000',
    accentMuted: 'color-mix(in oklab, #000000 15%, transparent)',
  },
  org_github: {
    icon: 'github',
    accent: '#24292e',
    accentMuted: 'color-mix(in oklab, #24292e 15%, transparent)',
  },
  org_dribbble: {
    icon: 'dribbble',
    accent: '#ea4c89',
    accentMuted: 'color-mix(in oklab, #ea4c89 15%, transparent)',
  },
}

export function getOrganizationBrand(orgId: string): OrganizationBrand {
  return (
    organizationBranding[orgId] ?? {
      icon: 'fallback',
      accent: '#64748b',
      accentMuted: 'color-mix(in oklab, #64748b 18%, transparent)',
    }
  )
}
