/** Profile field rules shared by the profile screen and the auth hooks that enforce them. */
export class ProfileRules {
  static readonly NAME_MAX = 100
  /** Pictures and logos are stored as squares of this size. */
  static readonly IMAGE_SIZE_PX = 256
  static readonly PASSWORD_MIN = 8
  static readonly PASSWORD_MAX = 128

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
   * Pictures arriving with a new account: an https URL from Google or GitHub.
   * Uploaded pictures are written by the upload endpoint, never through here.
   */
  static providerImage(value: unknown): string | null {
    if (typeof value !== 'string' || value.length > 2048) return null
    try {
      const url = new URL(value)
      return url.protocol === 'https:' ? url.href : null
    } catch {
      return null
    }
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
