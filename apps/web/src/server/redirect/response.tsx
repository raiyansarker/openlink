import { HoldPages, type HoldPageId, type SocialPreview } from '@openlink/contracts'

import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ExpiredLinkIllustration, LockedLinkIllustration } from '#/components/not-found/LinkStateIllustrations'
import NotFoundIllustration from '#/components/not-found/NotFoundIllustration'
import EmptyLinksIllustration from '#/components/links/EmptyLinksIllustration'
import type { ResolveOutcome } from './resolve'

type BrandedPage = {
  title: string
  /** Small caps line above the heading, e.g. "Error 404". */
  eyebrow?: string
  heading: string
  body: string
  illustration: ReactElement
  /** Trusted HTML under the copy (forms, buttons). */
  content?: string
}

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

  /**
   * The app's look for visitor-facing pages: the same illustrations, tokens
   * and type as the dashboard's 404, in light and dark, with no scripts.
   */
  static branded(page: BrandedPage): string {
    const art = renderToStaticMarkup(page.illustration)
    const eyebrow = page.eyebrow ? `<p class="eyebrow">${PublicPage.escape(page.eyebrow)}</p>` : ''
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${PublicPage.escape(page.title)}</title><style>${PublicPage.STYLES}</style></head><body><main><div class="art">${art}</div>${eyebrow}<h1>${PublicPage.escape(page.heading)}</h1><p class="body">${PublicPage.escape(page.body)}</p>${page.content ?? ''}</main></body></html>`
  }

  private static readonly STYLES = [
    ':root{color-scheme:light dark;--color-text-primary:light-dark(#0a0a0a,#f4f4f5);--color-text-secondary:light-dark(#4b4b50,#c9c9ce);--color-background-surface:light-dark(#fff,#18181b);--color-background-body:light-dark(#f7f7f8,#0f0f11);--color-border:light-dark(rgba(0,0,0,.12),rgba(255,255,255,.14));--accent:light-dark(#1b1b1b,#f1f1f1);--on-accent:light-dark(#fff,#111)}',
    '*{box-sizing:border-box}html,body{margin:0;height:100%}',
    "body{display:flex;align-items:center;justify-content:center;padding:48px 24px;background:var(--color-background-body);color:var(--color-text-primary);font:16px/1.5 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center}",
    'main{max-width:30rem;display:flex;flex-direction:column;align-items:center;gap:12px}',
    '.art{margin-bottom:20px}.art svg{max-width:100%;height:auto}',
    '.eyebrow{margin:0;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--color-text-secondary)}',
    'h1{margin:0;font-size:clamp(24px,5vw,32px);line-height:1.2;letter-spacing:-.02em}',
    '.body{margin:0;color:var(--color-text-secondary)}',
    'form{display:flex;gap:8px;width:100%;max-width:22rem;margin-top:16px}',
    'input{flex:1;min-width:0;height:40px;padding:0 12px;border-radius:10px;border:1px solid var(--color-border);background:var(--color-background-surface);color:inherit;font:inherit}',
    'input:focus{outline:2px solid var(--accent);outline-offset:1px}',
    'button,.button{height:40px;padding:0 16px;border:0;border-radius:10px;background:var(--accent);color:var(--on-accent);font:inherit;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}',
    '.alert{margin:4px 0 0;color:light-dark(#b42318,#ff8a80);font-weight:500}',
    '.powered{margin:24px 0 0;padding-top:16px;border-top:1px solid var(--color-border);font-size:13px;color:var(--color-text-secondary)}.powered a{color:var(--color-text-primary);font-weight:600;text-decoration:none}.powered a:hover{text-decoration:underline}',
  ].join('')
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

/** The card crawlers read when a link is shared (Open Graph and Twitter tags). */
export class PreviewPageView {
  static render(preview: SocialPreview, fallbackTitle: string, shortUrl: URL): Response {
    const title = preview.title || fallbackTitle
    // Our own uploads are stored as paths; crawlers need absolute URLs.
    const image = preview.imageUrl ? new URL(preview.imageUrl, shortUrl.origin).toString() : null
    const meta = (attribute: 'property' | 'name', key: string, value: string) =>
      `<meta ${attribute}="${key}" content="${PublicPage.escape(value)}">`
    const tags = [
      meta('property', 'og:type', 'website'),
      meta('property', 'og:url', shortUrl.toString()),
      meta('property', 'og:title', title),
      preview.description ? meta('property', 'og:description', preview.description) : '',
      image ? meta('property', 'og:image', image) : '',
      meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
      meta('name', 'twitter:title', title),
      preview.description ? meta('name', 'twitter:description', preview.description) : '',
      image ? meta('name', 'twitter:image', image) : '',
      preview.description ? meta('name', 'description', preview.description) : '',
    ].join('')
    const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${PublicPage.escape(title)}</title>${tags}</head><body><h1>${PublicPage.escape(title)}</h1></body></html>`
    // Short cache: crawlers re-fetch rarely, and owners may edit the card.
    return new Response(document, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300', 'x-robots-tag': 'noindex' },
    })
  }
}

/** A cloaked link: the destination fills the page while the short URL stays in the address bar. */
export class CloakPageView {
  static render(destination: string, title: string): Response {
    const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${PublicPage.escape(title)}</title><style>html,body{margin:0;height:100%;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}</style></head><body><iframe src="${PublicPage.escape(destination)}" title="${PublicPage.escape(title)}" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen; clipboard-write; autoplay; encrypted-media; picture-in-picture"></iframe></body></html>`
    return PublicPage.html(200, document, {
      // The destination may redirect elsewhere, so any web origin may fill the frame.
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; frame-src https: http:",
      'referrer-policy': 'strict-origin-when-cross-origin',
    })
  }
}

export class PasswordPageView {
  static render(message?: string, status = 401): Response {
    const alert = message ? `<p class="alert" role="alert">${PublicPage.escape(message)}</p>` : ''
    const locked = status === 429
    return PublicPage.html(
      status,
      PublicPage.branded({
        title: 'Password required',
        heading: 'This link is password protected',
        body: 'Enter the password you were given to continue.',
        illustration: <LockedLinkIllustration width={240} />,
        content: `${alert}<form method="post"><input type="password" name="password" aria-label="Password" placeholder="Password" autocomplete="off" ${locked ? 'disabled' : 'autofocus'} required><button type="submit"${locked ? ' disabled' : ''}>Continue</button></form>`,
      }),
    )
  }
}

/** Visitor pages for links that do not exist or no longer work. */
export class LinkMissingView {
  static notFound(appOrigin: string | null): Response {
    return PublicPage.html(
      404,
      PublicPage.branded({
        title: 'Link not found',
        eyebrow: 'Error 404',
        heading: 'This link went nowhere',
        body: 'The short link doesn’t exist, was removed, or the address has a typo.',
        illustration: <NotFoundIllustration width={260} />,
        // Only the app's own host offers a way in; custom domains belong to their owners.
        content: appOrigin ? `<a class="button" href="${PublicPage.escape(appOrigin)}/w">Go to OpenLink</a>` : '',
      }),
    )
  }

  static expired(): Response {
    return PublicPage.html(
      410,
      PublicPage.branded({
        title: 'Link expired',
        eyebrow: 'Link expired',
        heading: 'This link has run its course',
        body: 'It reached its end date or its click limit. Ask whoever shared it for a new one.',
        illustration: <ExpiredLinkIllustration width={240} />,
      }),
    )
  }
}

/**
 * What a custom domain shows at its root (`go.brand.com/`, no back-half): it
 * explains the address is a short-link domain, with a quiet "powered by" link.
 * The workspace behind it stays private.
 */
export class VanityDomainView {
  static render(hostname: string, appOrigin: string | null): Response {
    const credit = appOrigin
      ? `<p class="powered">Powered by <a href="${PublicPage.escape(appOrigin)}" rel="noopener">OpenLink</a></p>`
      : ''
    return PublicPage.html(
      200,
      PublicPage.branded({
        title: hostname,
        eyebrow: 'Branded short links',
        heading: hostname,
        body: 'Every link here is created and managed by the owner of this domain. Open the full link you were given and it takes you straight to its destination.',
        illustration: <EmptyLinksIllustration width={220} />,
        content: credit,
      }),
      // A real page, unlike the 404s: fine to cache briefly at the edge.
      { 'cache-control': 'public, max-age=300' },
    )
  }
}

/** Turns a resolved short-link request into its HTTP response. */
export class RedirectResponses {
  /** `shortUrl` is the URL that was requested (used for share cards); `onAppHost` adds a way into the app on 404s. */
  static for(outcome: ResolveOutcome, shortUrl: URL = new URL('https://localhost/'), onAppHost = false): Response {
    switch (outcome.type) {
      case 'cloak':
        return CloakPageView.render(outcome.url, outcome.title)
      case 'preview':
        return PreviewPageView.render(outcome.preview, outcome.title, shortUrl)
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
      case 'password_rate_limited':
        return PasswordPageView.render('Too many attempts. Wait a minute, then try again.', 429)
      case 'gone':
        return LinkMissingView.expired()
      case 'not_found':
        return LinkMissingView.notFound(onAppHost ? shortUrl.origin : null)
    }
  }
}
