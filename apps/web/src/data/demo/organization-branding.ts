/** Visual identity per org for the icon rail (demo only). */
export type OrganizationBrandIconKey = 'openlink' | 'acme' | 'devrel' | 'fallback'

export type OrganizationBrand = {
  icon: OrganizationBrandIconKey
  accent: string
  accentMuted: string
}

export const organizationBranding: Record<string, OrganizationBrand> = {
  org_openlink: {
    icon: 'openlink',
    accent: '#0d9488',
    accentMuted: 'color-mix(in oklab, #0d9488 20%, transparent)',
  },
  org_acme: {
    icon: 'acme',
    accent: '#4f46e5',
    accentMuted: 'color-mix(in oklab, #4f46e5 20%, transparent)',
  },
  org_devrel: {
    icon: 'devrel',
    accent: '#ea580c',
    accentMuted: 'color-mix(in oklab, #ea580c 20%, transparent)',
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
