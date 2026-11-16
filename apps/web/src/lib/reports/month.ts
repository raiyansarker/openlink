/** A calendar month as used by Reports: "2026-11". */
export class ReportMonth {
  private static readonly PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

  constructor(
    readonly year: number,
    /** 0 = January. */
    readonly monthIndex: number,
  ) {}

  static isValid(value: unknown): value is string {
    return typeof value === 'string' && ReportMonth.PATTERN.test(value)
  }

  static parse(value: string): ReportMonth {
    const [year, month] = value.split('-').map(Number)
    return new ReportMonth(year!, month! - 1)
  }

  /** The month the viewer is in. */
  static current(now = new Date()): ReportMonth {
    return new ReportMonth(now.getFullYear(), now.getMonth())
  }

  /** This month and the `count - 1` before it, newest first. */
  static recent(count: number, now = new Date()): ReportMonth[] {
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return new ReportMonth(date.getFullYear(), date.getMonth())
    })
  }

  get key(): string {
    return `${this.year}-${String(this.monthIndex + 1).padStart(2, '0')}`
  }

  /** "November 2026". */
  get label(): string {
    return new Date(this.year, this.monthIndex, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }

  /**
   * The viewer's UTC offset in minutes for this month (mid-month, so a DST
   * change at either end doesn't shift the whole month).
   */
  get tzOffset(): number {
    return -new Date(this.year, this.monthIndex, 15).getTimezoneOffset()
  }
}
