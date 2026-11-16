import { getDomain } from 'tldts'

/**
 * The name of one DNS record, in both forms a person needs.
 *
 * The Domain SDK returns full names (`_cf-custom-hostname.go.company.com`).
 * Most DNS providers want the part before the zone (`_cf-custom-hostname.go`)
 * in their "Name" or "Host" field, and add `company.com` themselves; pasting
 * the full name there creates `…go.company.com.company.com`.
 */
export class DnsRecordName {
  private constructor(
    /** The full name, e.g. `_cf-custom-hostname.go.company.com`. */
    readonly fqdn: string,
    /** The zone it lives in, e.g. `company.com` (or `company.co.uk`). */
    readonly zone: string,
  ) {}

  /**
   * `name` is the record's name as stored: a full name (from the SDK), a
   * label relative to the domain (`_verify`), or `@` for the domain itself.
   */
  static of(name: string, domainHostname: string): DnsRecordName {
    const hostname = DnsRecordName.clean(domainHostname)
    const fqdn = DnsRecordName.toFqdn(DnsRecordName.clean(name), hostname)
    return new DnsRecordName(fqdn, DnsRecordName.zoneOf(hostname))
  }

  /** What to type in the DNS provider's Name/Host field: `@` for the zone itself. */
  get host(): string {
    if (this.fqdn === this.zone) return '@'
    return this.fqdn.endsWith(`.${this.zone}`) ? this.fqdn.slice(0, -(this.zone.length + 1)) : this.fqdn
  }

  /** The registrable domain, honoring shared suffixes like `co.uk` and `github.io`. */
  static zoneOf(hostname: string): string {
    return getDomain(hostname, { allowPrivateDomains: true }) ?? hostname
  }

  /** Same rule as the SDK's `fullRecordName`: dotted names are already full. */
  private static toFqdn(name: string, hostname: string): string {
    if (!name || name === '@') return hostname
    if (name === hostname || name.endsWith(`.${hostname}`) || name.includes('.')) return name
    return `${name}.${hostname}`
  }

  private static clean(value: string): string {
    return value.trim().replace(/\.$/, '').toLowerCase()
  }
}
