/** Post-login redirect targets. */
export class LoginRedirect {
  static readonly DEFAULT = '/w'

  private static readonly ORIGIN = 'http://openlink.invalid'

  private static hasUnsafeCharacter(value: string) {
    return [...value].some((char) => char === '\\' || char.charCodeAt(0) < 0x20)
  }

  /**
   * Accept only same-origin paths, so a crafted `?redirect=` cannot send
   * someone to another site or into the auth endpoints.
   */
  static sanitize(value: unknown, fallback: string = LoginRedirect.DEFAULT): string {
    if (typeof value !== 'string' || !value.startsWith('/')) return fallback
    if (value.startsWith('//') || LoginRedirect.hasUnsafeCharacter(value)) return fallback
    let url: URL
    try {
      url = new URL(value, LoginRedirect.ORIGIN)
    } catch {
      return fallback
    }
    if (url.origin !== LoginRedirect.ORIGIN) return fallback
    if (url.pathname === '/login' || url.pathname.startsWith('/api/')) return fallback
    return value
  }
}
