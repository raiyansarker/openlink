/**
 * On the app's own host, short links share the URL space with the app itself,
 * so these first path segments can never be slugs there. Custom domains only
 * serve redirects and have no such limit.
 */
export class ReservedSlugs {
  static readonly ALL: ReadonlySet<string> = new Set([
    'about', 'api', 'app', 'assets', 'create', 'dashboard', 'edit', 'favicon.ico', 'help', 'login',
    'logout', 'onboarding', 'robots.txt', 'settings', 'signin', 'signup', 'static', 'w',
  ])

  static isReserved(slug: string): boolean {
    return ReservedSlugs.ALL.has(slug.toLowerCase())
  }
}
