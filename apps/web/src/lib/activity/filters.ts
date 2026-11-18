import { ACTIVITY_CATEGORY_LABELS } from '#/lib/activity/labels'
import type { ActivityCategory } from '#/lib/api/types'

export type CategoryFilter = 'all' | ActivityCategory

export const ACTIVITY_CATEGORIES = Object.keys(ACTIVITY_CATEGORY_LABELS) as ActivityCategory[]

/** Filters as kept in the URL by the route. */
export type ActivityFilterState = { category: CategoryFilter; q: string }
