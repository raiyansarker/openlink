export type DomainReadiness = 'active' | 'verifying' | 'pending' | 'failed'

export type DomainDnsPurpose = 'routing' | 'ownership' | 'certificate'

export type DomainDnsRecordStatus = 'required' | 'verified' | 'failed'

export type DomainDnsRecord = {
  type: string
  host: string
  value: string
  purpose: DomainDnsPurpose
  status: DomainDnsRecordStatus
}

export type WorkspaceCustomDomain = {
  id: string
  orgId: string
  hostname: string
  readiness: DomainReadiness
  linkCount: number
  createdAt: string
  activeAt?: string
  dnsRecords: DomainDnsRecord[]
}

export const demoCustomDomains: WorkspaceCustomDomain[] = [
  {
    id: 'dom_apple_go',
    orgId: 'org_apple',
    hostname: 'go.apple.com',
    readiness: 'active',
    linkCount: 142,
    createdAt: '2025-08-12T10:00:00.000Z',
    activeAt: '2025-08-14T16:30:00.000Z',
    dnsRecords: [
      {
        type: 'CNAME',
        host: 'go',
        value: 'edge.openlink.dev',
        purpose: 'routing',
        status: 'verified',
      },
      {
        type: 'TXT',
        host: 'go',
        value: 'ol-site-verification=go-apple-com-7f2a',
        purpose: 'ownership',
        status: 'verified',
      },
    ],
  },
  {
    id: 'dom_apple_links',
    orgId: 'org_apple',
    hostname: 'links.apple.com',
    readiness: 'verifying',
    linkCount: 0,
    createdAt: '2025-11-10T09:00:00.000Z',
    dnsRecords: [
      {
        type: 'CNAME',
        host: 'links',
        value: 'edge.openlink.dev',
        purpose: 'routing',
        status: 'required',
      },
      {
        type: 'TXT',
        host: 'links',
        value: 'ol-site-verification=links-apple-com-9c1d',
        purpose: 'ownership',
        status: 'required',
      },
    ],
  },
  {
    id: 'dom_meta_brand',
    orgId: 'org_meta',
    hostname: 'brand.meta.com',
    readiness: 'active',
    linkCount: 38,
    createdAt: '2025-06-03T14:00:00.000Z',
    activeAt: '2025-06-05T11:20:00.000Z',
    dnsRecords: [
      {
        type: 'CNAME',
        host: 'brand',
        value: 'edge.openlink.dev',
        purpose: 'routing',
        status: 'verified',
      },
      {
        type: 'TXT',
        host: 'brand',
        value: 'ol-site-verification=brand-meta-com-a1b2',
        purpose: 'ownership',
        status: 'verified',
      },
    ],
  },
  {
    id: 'dom_github_l',
    orgId: 'org_github',
    hostname: 'l.github.io',
    readiness: 'pending',
    linkCount: 0,
    createdAt: '2025-11-11T18:00:00.000Z',
    dnsRecords: [
      {
        type: 'CNAME',
        host: 'l',
        value: 'edge.openlink.dev',
        purpose: 'routing',
        status: 'required',
      },
      {
        type: 'TXT',
        host: 'l',
        value: 'ol-site-verification=l-github-io-3b8e',
        purpose: 'ownership',
        status: 'required',
      },
    ],
  },
  {
    id: 'dom_google_go',
    orgId: 'org_google',
    hostname: 'go.google',
    readiness: 'failed',
    linkCount: 0,
    createdAt: '2025-09-20T08:00:00.000Z',
    dnsRecords: [
      {
        type: 'CNAME',
        host: 'go',
        value: 'edge.openlink.dev',
        purpose: 'routing',
        status: 'failed',
      },
      {
        type: 'TXT',
        host: 'go',
        value: 'ol-site-verification=go-google-c4d5',
        purpose: 'ownership',
        status: 'failed',
      },
    ],
  },
]
