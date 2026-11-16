import { HoldPages, type HoldPageId } from '@openlink/contracts'

import type { ResolveOutcome } from './resolve'

/** Small, dependency-free HTML pages for public short-link responses. */
export class PublicPage {
  static escape(value: string): string {
    return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
  }

  /** A page that is never cached and never indexed. */
  static html(status: number, document: string, headers: Record<string, string> = {}): Response {
    return new Response(document, {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex',
        ...headers,
      },
    })
  }

  /** The app's plain layout: centred column, system font, light and dark. */
  static simple(title: string, body: string): string {
    return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${PublicPage.escape(title)}</title><body style="font-family:system-ui,sans-serif;max-width:28rem;margin:20vh auto;padding:0 1rem;line-height:1.5">${body}</body></html>`
  }
}

/** The placeholder pages a link on hold serves, matching the editor's preview. */
export class HoldPageView {
  static render(id: HoldPageId): Response {
    const page = HoldPages.get(id)
    const document = page.isServerStyle
      ? // Byte-for-byte the shape of nginx's own error pages, so it reads as a real outage.
        `<html>\r\n<head><title>${PublicPage.escape(page.heading)}</title></head>\r\n<body>\r\n<center><h1>${PublicPage.escape(page.heading)}</h1></center>\r\n<hr><center>${PublicPage.escape(page.footer ?? '')}</center>\r\n</body>\r\n</html>\r\n`
      : `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${PublicPage.escape(page.heading)}</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;color:#111;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center"><main style="padding:2rem;max-width:22rem"><h1 style="font-size:1.6rem;font-weight:650;letter-spacing:-0.01em;margin:0">${PublicPage.escape(page.heading)}</h1><p style="margin:.75rem 0 0;color:#555;line-height:1.5">${PublicPage.escape(page.body ?? '')}</p></main></body></html>`
    // A 503 tells crawlers the outage is temporary.
    return PublicPage.html(page.status, document, page.status === 503 ? { 'retry-after': '3600' } : {})
  }
}

export class PasswordPageView {
  static render(message?: string): Response {
    const alert = message ? `<p role="alert">${PublicPage.escape(message)}</p>` : ''
    return PublicPage.html(
      401,
      PublicPage.simple(
        'Password required',
        `<h1>Password required</h1>${alert}<form method="post"><input type="password" name="password" autocomplete="off" autofocus required> <button type="submit">Continue</button></form>`,
      ),
    )
  }
}

/** Turns a resolved short-link request into its HTTP response. */
export class RedirectResponses {
  static for(outcome: ResolveOutcome): Response {
    switch (outcome.type) {
      case 'redirect':
        return new Response(null, {
          status: outcome.status,
          headers: { location: outcome.url, 'cache-control': 'private, no-store' },
        })
      case 'hold':
        return HoldPageView.render(outcome.page)
      case 'password_required':
        return PasswordPageView.render()
      case 'password_invalid':
        return PasswordPageView.render('Incorrect password.')
      case 'gone':
        return PublicPage.html(410, PublicPage.simple('Link expired', '<h1>This link has expired</h1>'))
      case 'not_found':
        return PublicPage.html(404, PublicPage.simple('Link not found', '<h1>Link not found</h1>'))
    }
  }
}
