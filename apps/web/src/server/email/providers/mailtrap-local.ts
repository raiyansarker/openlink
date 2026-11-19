import { Effect } from 'effect'

import { buildMime, parseAddress, toBase64 } from '../mime'
import { EmailDeliveryError, type EmailProviderShape } from '../provider'

/** Mailtrap Local's HTTP API (`mailtrap-local -http-listen`). Captured mail shows in its web UI on the same port. */
const MAILTRAP_LOCAL_URL = 'http://127.0.0.1:3550'

/**
 * Mailtrap Local: a catcher on this machine, so nothing reaches real recipients.
 * Used for every email under `vite dev` (see `providers/index.ts`). If the request
 * cannot connect, `mailtrap-local` is not running.
 *
 * Posts to `/api/v1/ingest`, the endpoint Mailtrap Local's own SMTP server hands
 * parsed mail to. Mailtrap marks it internal, so its shape may change between releases.
 */
export const mailtrapLocalProvider = Effect.succeed<EmailProviderShape>({
  name: 'mailtrap-local',
  send: (email) =>
    Effect.gen(function* () {
      const from = parseAddress(email.from)
      const to = parseAddress(email.to)
      const date = new Date()
      const messageId = `<${crypto.randomUUID()}@${from.address.split('@')[1] || 'localhost'}>`
      const raw = buildMime(email, { messageId, date })

      const response = yield* Effect.tryPromise({
        try: () =>
          fetch(`${MAILTRAP_LOCAL_URL}/api/v1/ingest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              smtp_from: from.address,
              smtp_to: [to.address],
              message_id: messageId,
              from,
              to: [to],
              subject: email.subject,
              date: date.toISOString(),
              text: email.text,
              html: email.html,
              raw: toBase64(raw),
              size: new TextEncoder().encode(raw).length,
            }),
          }),
        catch: (error) =>
          new EmailDeliveryError({
            message: `Could not reach Mailtrap Local at ${MAILTRAP_LOCAL_URL}. Is mailtrap-local running? (${error instanceof Error ? error.message : String(error)})`,
            retryable: true,
          }),
      })
      if (!response.ok) {
        const body = yield* Effect.promise(() => response.text().catch(() => ''))
        return yield* new EmailDeliveryError({
          message: `Mailtrap Local responded ${response.status}: ${body.slice(0, 200)}`,
          retryable: response.status >= 500,
        })
      }
    }),
})
