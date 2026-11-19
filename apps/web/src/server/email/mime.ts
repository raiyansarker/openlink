import type { OutgoingEmail } from './provider'

const CRLF = '\r\n'

/** UTF-8 safe base64. */
export function toBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/** `OpenLink <a@b.co>` or a bare address, as `{ name, address }`. */
export function parseAddress(value: string): { name: string; address: string } {
  const match = /^\s*"?(.*?)"?\s*<([^>]+)>\s*$/.exec(value)
  return match ? { name: match[1], address: match[2].trim() } : { name: '', address: value.trim() }
}

/** Base64 wrapped at 76 characters, as MIME requires. */
const wrapped = (text: string) => toBase64(text).replace(/.{1,76}/g, (line) => line + CRLF)
/** RFC 2047 encoded-word, so non-ASCII subjects and names survive. */
const encodedWord = (text: string) => (/^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${toBase64(text)}?=`)

/** The RFC 822 source of an email: multipart/alternative with base64 text and HTML parts. */
export function buildMime(email: OutgoingEmail, { messageId, date }: { messageId: string; date: Date }) {
  const boundary = `openlink-${crypto.randomUUID()}`
  const from = parseAddress(email.from)
  return [
    `From: ${from.name ? `${encodedWord(from.name)} <${from.address}>` : from.address}`,
    `To: ${email.to}`,
    `Subject: ${encodedWord(email.subject)}`,
    `Date: ${date.toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapped(email.text),
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapped(email.html),
    `--${boundary}--`,
    '',
  ].join(CRLF)
}
