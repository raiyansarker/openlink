/** Builds CSV text that opens safely in spreadsheets. */
export class Csv {
  /** Quotes a cell and stops spreadsheet formulas (`=`, `+`, `-`, `@`, tab, CR) from running. */
  static cell(value: unknown): string {
    let text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value)
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }

  static build(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
    // CRLF line ends, as RFC 4180 and Excel expect.
    return [header, ...rows].map((row) => row.map(Csv.cell).join(',')).join('\r\n') + '\r\n'
  }
}
