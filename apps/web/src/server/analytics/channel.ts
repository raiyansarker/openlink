/** How a visitor found a link. */
export type ClickChannel = 'direct' | 'social' | 'search' | 'email' | 'qr' | 'referral'

/** Sorts a click into a channel from its referrer host and whether it came from our QR code. */
export class ChannelClassifier {
  private static readonly SOCIAL = [
    'facebook.com', 'fb.com', 'm.facebook.com', 'l.facebook.com', 'lm.facebook.com', 'instagram.com', 'l.instagram.com',
    'x.com', 't.co', 'twitter.com', 'linkedin.com', 'lnkd.in', 'reddit.com', 'old.reddit.com', 'youtube.com',
    'm.youtube.com', 'tiktok.com', 'pinterest.com', 'pin.it', 'threads.net', 'bsky.app', 'mastodon.social',
    'discord.com', 'telegram.org', 't.me', 'web.whatsapp.com', 'news.ycombinator.com', 'quora.com', 'snapchat.com',
  ]
  private static readonly SEARCH = [
    'google', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'search.yahoo.com', 'baidu.com', 'yandex', 'ecosia.org',
    'search.brave.com', 'startpage.com', 'kagi.com', 'naver.com',
  ]
  private static readonly EMAIL = [
    'mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'mail.yahoo.com',
    'mail.proton.me', 'app.fastmail.com', 'mail.zoho.com', 'icloud.com',
  ]

  static classify(referrerHost: string | null | undefined, fromQr: boolean): ClickChannel {
    if (fromQr) return 'qr'
    const host = referrerHost?.toLowerCase().replace(/^www\./, '')
    if (!host) return 'direct'
    if (ChannelClassifier.matches(host, ChannelClassifier.EMAIL)) return 'email'
    // Search engines run on many country domains (google.co.uk, yandex.ru), so match by name.
    if (ChannelClassifier.SEARCH.some((name) => host === name || host.startsWith(`${name}.`) || host.includes(`.${name}.`) || host.endsWith(`.${name}`)))
      return 'search'
    if (ChannelClassifier.matches(host, ChannelClassifier.SOCIAL)) return 'social'
    return 'referral'
  }

  private static matches(host: string, list: readonly string[]): boolean {
    return list.some((entry) => host === entry || host.endsWith(`.${entry}`))
  }
}
