import { RANGE_OPTIONS, type AnalyticsRange } from './report'

/** How "Clicks over time" is drawn. */
export type TrafficView = 'total' | 'channels'

/** Analytics settings as they appear in the URL. Defaults are left out so URLs stay short. */
export type AnalyticsSearch = {
  range?: AnalyticsRange
  /** Present (false) only when comparing with the previous period is off. */
  compare?: false
  /** Present only for the non-default chart view. */
  chart?: 'channels'
  /** Workspace page only: drill into one link. */
  link?: string
}

/** The same settings with every default filled in, for the components. */
export type AnalyticsView = {
  range: AnalyticsRange
  isComparing: boolean
  trafficView: TrafficView
  linkId: string | null
}

/**
 * Reads and writes analytics settings in the URL, so a period, chart or
 * drilled-in link survives a reload and can be shared.
 */
export class AnalyticsSearchParams {
  static readonly DEFAULT_RANGE: AnalyticsRange = '30d'
  private static readonly RANGES = new Set<string>(RANGE_OPTIONS.map((option) => option.value))

  /**
   * For `validateSearch`: keeps only valid values; anything else falls back to the default.
   * Every key is set (undefined when left out) so raw values from parent routes can't leak through.
   */
  static parse(search: Record<string, unknown>, options: { withLink: boolean }): AnalyticsSearch {
    const range = search.range
    const isValidRange =
      typeof range === 'string' && AnalyticsSearchParams.RANGES.has(range) && range !== AnalyticsSearchParams.DEFAULT_RANGE
    return {
      range: isValidRange ? (range as AnalyticsRange) : undefined,
      compare: search.compare === false || search.compare === 'false' ? false : undefined,
      chart: search.chart === 'channels' ? 'channels' : undefined,
      ...(options.withLink
        ? { link: typeof search.link === 'string' && search.link ? search.link : undefined }
        : {}),
    }
  }

  static toView(search: AnalyticsSearch): AnalyticsView {
    return {
      range: search.range ?? AnalyticsSearchParams.DEFAULT_RANGE,
      isComparing: search.compare !== false,
      trafficView: search.chart ?? 'total',
      linkId: search.link ?? null,
    }
  }

  /** The URL values for `view`, with defaults dropped. */
  static toSearch(view: AnalyticsView): AnalyticsSearch {
    return {
      range: view.range === AnalyticsSearchParams.DEFAULT_RANGE ? undefined : view.range,
      compare: view.isComparing ? undefined : false,
      chart: view.trafficView === 'total' ? undefined : view.trafficView,
      link: view.linkId ?? undefined,
    }
  }
}
