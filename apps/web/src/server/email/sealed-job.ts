import type { EmailTemplateName } from '@openlink/email'

import type { EmailJob } from './job'

/**
 * What a workflow run is started with. Cloudflare keeps run params and shows them in the
 * dashboard, so the job itself (recipient, sign-in and reset links, names) is encrypted.
 * Only the template name stays readable, to tell runs apart.
 */
export type SealedEmailJob = {
  template: EmailTemplateName
  /** `v1.<iv>.<ciphertext>`, AES-256-GCM, base64url. */
  sealed: string
}

const VERSION = 'v1'
const encoder = new TextEncoder()

const toBase64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const fromBase64url = (value: string) =>
  Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0))

/** A key for email jobs only, derived from the app secret so there is nothing new to configure. */
async function jobKey(secret: string) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: encoder.encode('openlink/email-job/v1') },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export class EmailJobSeal {
  static async seal(secret: string, job: EmailJob): Promise<SealedEmailJob> {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const data = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await jobKey(secret), encoder.encode(JSON.stringify(job))),
    )
    return { template: job.message.template, sealed: `${VERSION}.${toBase64url(iv)}.${toBase64url(data)}` }
  }

  /** The job, or null if it was not sealed with this secret, was altered, or is not a sealed job at all. */
  static async open(secret: string, sealed: SealedEmailJob): Promise<EmailJob | null> {
    if (typeof sealed?.sealed !== 'string') return null
    const [version, iv, data] = sealed.sealed.split('.')
    if (version !== VERSION || !iv || !data) return null
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64url(iv) }, await jobKey(secret), fromBase64url(data))
      return JSON.parse(new TextDecoder().decode(plain)) as EmailJob
    } catch {
      return null
    }
  }
}
