/**
 * Quick, local answer to "could this browser have a session with the app?".
 *
 * The app's sign-in state lives in its session cookie, so an absent cookie
 * means signed out — no request needed. Used to keep the cached form from
 * ever painting for a signed-out user. The cookie's presence is not proof of
 * a valid session; the server still has the final word on that.
 */
export async function hasSessionCookie(origin: string): Promise<boolean> {
  try {
    const cookies = await chrome.cookies.getAll({ url: origin })
    // Better-auth keeps the session in "<prefix>_session_token" (prefix openlink).
    return cookies.some((c) => c.name.includes('session'))
  } catch {
    // If the store cannot be read, assume a session might exist and verify online.
    return true
  }
}
