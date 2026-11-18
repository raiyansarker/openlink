/** Whether this browser can use passkeys at all, and with autofill. */
export class PasskeySupport {
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function'
  }

  static async canAutofill(): Promise<boolean> {
    if (!PasskeySupport.isAvailable()) return false
    const check = (
      window.PublicKeyCredential as unknown as { isConditionalMediationAvailable?: () => Promise<boolean> }
    ).isConditionalMediationAvailable
    return typeof check === 'function' ? check().catch(() => false) : false
  }
}
