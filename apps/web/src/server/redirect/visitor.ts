export type VisitorPlatform = 'ios' | 'android' | 'other'

/** Cloudflare attaches request metadata (`request.cf`) on Workers. */
type CfRequest = Request & { cf?: { country?: unknown; city?: unknown; latitude?: unknown; longitude?: unknown } }

/** Approximate place from the IP address, as Cloudflare reports it. */
export type VisitorPlace = { city: string | null; latitude: number | null; longitude: number | null }

/** Short URLs in our QR codes carry this parameter, so scans can be told apart. */
export const QR_PARAM = 'qr'

/**
 * Who is opening a short link, as far as the request tells: their platform,
 * country, where they came from, and whether they are a link-preview crawler.
 */
export class Visitor {
  constructor(
    readonly userAgent: string,
    /** ISO 3166-1 alpha-2, upper case; null when unknown (local dev, Tor "T1", "XX"). */
    readonly country: string | null,
    readonly referrer: string | null,
    readonly place: VisitorPlace = { city: null, latitude: null, longitude: null },
    /** Only ever hashed (for unique visitors), never stored. */
    readonly ip: string | null = null,
    /** Opened by scanning one of our QR codes. */
    readonly fromQr = false,
  ) {}

  static readonly ANONYMOUS = new Visitor('', null, null)

  static fromRequest(request: Request): Visitor {
    const cf = (request as CfRequest).cf
    const country = typeof cf?.country === 'string' ? cf.country : request.headers.get('cf-ipcountry')
    const number = (value: unknown) => {
      const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
      return Number.isFinite(parsed) ? parsed : null
    }
    return new Visitor(
      request.headers.get('user-agent') ?? '',
      Visitor.normalizeCountry(country),
      request.headers.get('referer'),
      {
        city: typeof cf?.city === 'string' && cf.city ? cf.city : null,
        latitude: number(cf?.latitude),
        longitude: number(cf?.longitude),
      },
      request.headers.get('cf-connecting-ip'),
      new URL(request.url).searchParams.has(QR_PARAM),
    )
  }

  static normalizeCountry(value: string | null | undefined): string | null {
    const code = value?.trim().toUpperCase()
    return code && /^[A-Z]{2}$/.test(code) && code !== 'XX' && code !== 'T1' ? code : null
  }

  get platform(): VisitorPlatform {
    const ua = this.userAgent
    // iPadOS reports itself as a Mac; only the explicit mobile tokens are trusted here.
    if (/\b(iPhone|iPad|iPod)\b/.test(ua)) return 'ios'
    if (/\bAndroid\b/.test(ua)) return 'android'
    return 'other'
  }

  /** Crawlers that fetch a URL to draw a share card (chat apps, social networks, search previews). */
  get isPreviewBot(): boolean {
    return Visitor.PREVIEW_BOTS.test(this.userAgent)
  }

  /**
   * Only fetchers that exist to draw cards. Search engines are left out (they
   * should follow the redirect), and so are in-app browsers whose user agents
   * name their app (LINE, Pinterest, Snapchat), since real people use those.
   */
  private static readonly PREVIEW_BOTS =
    /facebookexternalhit|Facebot|meta-externalagent|Twitterbot|LinkedInBot|Slackbot|Slack-ImgProxy|Discordbot|TelegramBot|WhatsApp\/|SkypeUriPreview|Pinterestbot|redditbot|Embedly|Iframely|vkShare|Mastodon\/|Bluesky Cardyb|MicrosoftPreview/i
}
