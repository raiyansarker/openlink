/** Tabs on a link's detail page, in order; also the values `?tab=` accepts. */
export const LINK_DETAIL_TABS = ['analytics', 'notes', 'settings', 'history'] as const
export type LinkDetailTab = (typeof LINK_DETAIL_TABS)[number]
