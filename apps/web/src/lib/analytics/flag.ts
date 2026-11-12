/** "BD" → 🇧🇩 via regional indicator symbols; empty for anything else. */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return ''
  const base = 0x1f1e6 - 'A'.charCodeAt(0)
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((char) => base + char.charCodeAt(0)),
  )
}
