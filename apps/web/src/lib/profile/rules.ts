/** Profile field rules shared by the profile screen and the auth hooks that enforce them. */
export class ProfileRules {
  static readonly NAME_MAX = 100
  /** A 256px WebP portrait is ~10–30 KB; this leaves headroom while keeping session payloads small. */
  static readonly AVATAR_DATA_URL_MAX = 150_000
  static readonly AVATAR_SIZE_PX = 256
  static readonly PASSWORD_MIN = 8
  static readonly PASSWORD_MAX = 128

  private static readonly DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/

  /** Trimmed name with inner whitespace collapsed, or an error message. */
  static name(value: unknown): { ok: true; value: string } | { ok: false; message: string } {
    if (typeof value !== 'string') return { ok: false, message: 'Enter your name.' }
    const name = value.trim().replace(/\s+/g, ' ')
    if (!name) return { ok: false, message: 'Enter your name.' }
    if (name.length > ProfileRules.NAME_MAX) {
      return { ok: false, message: `Use ${ProfileRules.NAME_MAX} characters or fewer.` }
    }
    return { ok: true, value: name }
  }

  /**
   * Avatars are an https URL (from Google or GitHub) or a small inline image
   * uploaded from the profile screen. SVG and other schemes are never accepted,
   * since every teammate's browser renders the value.
   */
  static image(value: unknown): { ok: true; value: string | null } | { ok: false; message: string } {
    if (value === null || value === undefined || value === '') return { ok: true, value: null }
    if (typeof value !== 'string') return { ok: false, message: 'That picture could not be used.' }
    if (value.startsWith('data:')) {
      if (value.length > ProfileRules.AVATAR_DATA_URL_MAX) {
        return { ok: false, message: 'That picture is too large. Choose a smaller one.' }
      }
      return ProfileRules.DATA_URL.test(value)
        ? { ok: true, value }
        : { ok: false, message: 'Use a PNG, JPG, WebP, or GIF picture.' }
    }
    try {
      const url = new URL(value)
      if (url.protocol === 'https:' && value.length <= 2048) return { ok: true, value: url.href }
    } catch {
      // fall through
    }
    return { ok: false, message: 'That picture could not be used.' }
  }

  /** Problems with a new password, checked before it is sent. */
  static newPassword(input: { current: string; next: string; confirm: string }): string | null {
    if (input.next.length < ProfileRules.PASSWORD_MIN) {
      return `Use at least ${ProfileRules.PASSWORD_MIN} characters.`
    }
    if (input.next.length > ProfileRules.PASSWORD_MAX) {
      return `Use ${ProfileRules.PASSWORD_MAX} characters or fewer.`
    }
    if (input.next !== input.confirm) return 'The new passwords do not match.'
    if (input.next === input.current) return 'Choose a password different from your current one.'
    return null
  }
}
