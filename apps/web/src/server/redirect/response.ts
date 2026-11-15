import type { ResolveOutcome } from './resolve'

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

const html = (status: number, title: string, body: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><body style="font-family:system-ui,sans-serif;max-width:28rem;margin:20vh auto;padding:0 1rem">${body}</body>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
      },
    },
  )

const passwordForm = (message?: string) =>
  `<h1>Password required</h1>${message ? `<p role="alert">${escapeHtml(message)}</p>` : ''}<form method="post"><input type="password" name="password" autocomplete="off" autofocus required> <button type="submit">Continue</button></form>`

/** Render the public response for a resolved short-link request. */
export function outcomeToResponse(outcome: ResolveOutcome): Response {
  switch (outcome.type) {
    case 'redirect':
      return new Response(null, {
        status: outcome.status,
        headers: { location: outcome.url, 'cache-control': 'private, no-store' },
      })
    case 'password_required':
      return html(401, 'Password required', passwordForm())
    case 'password_invalid':
      return html(401, 'Password required', passwordForm('Incorrect password.'))
    case 'gone':
      return html(410, 'Link expired', '<h1>This link has expired</h1>')
    case 'not_found':
      return html(404, 'Link not found', '<h1>Link not found</h1>')
  }
}
