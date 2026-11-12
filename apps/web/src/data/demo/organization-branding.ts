/** Visual identity per org for the icon rail (demo only). */
export type OrganizationBrandIconKey =
  | 'gitlab'
  | 'github'
  | 'dribbble'
  | 'meta'
  | 'google'
  | 'fallback'

export type OrganizationBrand = {
  icon: OrganizationBrandIconKey
  accent: string
  accentMuted: string
}

export const organizationBranding: Record<string, OrganizationBrand> = {
  org_gitlab: {
    icon: 'gitlab',
    accent: '#FC6D26',
    accentMuted: 'color-mix(in oklab, #FC6D26 15%, transparent)',
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
  org_meta: {
    icon: 'meta',
    accent: '#0866FF',
    accentMuted: 'color-mix(in oklab, #0866FF 15%, transparent)',
  },
  org_google: {
    icon: 'google',
    accent: '#4285F4',
    accentMuted: 'color-mix(in oklab, #4285F4 15%, transparent)',
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
