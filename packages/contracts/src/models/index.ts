import { type } from 'arktype'

export const HealthStatus = type("'ok' | 'degraded' | 'error'")
export const HealthCheckStatus = type("'ok' | 'error' | 'skipped'")

export const HealthCheck = type({
  name: 'string',
  status: HealthCheckStatus,
  'required?': 'boolean',
  'message?': 'string',
  'latencyMs?': 'number>=0',
})

export const HealthResponse = type({
  status: HealthStatus,
  service: "'openlink'",
  checkedAt: 'string',
  checks: HealthCheck.array(),
})

export const ErrorResponse = type({
  error: {
    code: 'string',
    message: 'string',
    'details?': type({ '[string]': 'unknown' }),
  },
})

export const SignUpRequest = type({
  email: 'string.email',
  password: 'string>=8',
  name: 'string>0',
})

export const SignInRequest = type({
  email: 'string.email',
  password: 'string',
})

export const User = type({
  id: 'string',
  email: 'string.email',
  name: 'string',
  createdAt: 'string',
})

export const AuthSessionResponse = type({
  user: User,
})

export const SessionResponse = type({
  authenticated: 'boolean',
  'user?': User,
})

export const OrganizationRole = type("'admin' | 'member'")

export const Organization = type({
  id: 'string',
  name: 'string',
  slug: 'string',
  createdAt: 'string',
})

export const OrganizationMembership = type({
  organization: Organization,
  role: OrganizationRole,
  joinedAt: 'string',
})

export const CreateOrganizationRequest = type({
  name: 'string',
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  inviteToken: 'string',
})

export const CreateOrganizationInviteRequest = type({
  email: 'string.email',
  role: OrganizationRole,
})

export const AcceptInviteRequest = type({
  token: 'string',
})

export const OrganizationInvite = type({
  id: 'string',
  organizationId: 'string',
  email: 'string.email',
  role: OrganizationRole,
  expiresAt: 'string',
  token: 'string',
})

export const DomainReadiness = type(
  "'pending' | 'verifying' | 'active' | 'failed' | 'removing'",
)

export const DnsRecordInstruction = type({
  type: 'string',
  host: 'string',
  value: 'string',
  purpose: "'routing' | 'ownership' | 'certificate'",
  'status?': "'required' | 'verified' | 'failed'",
})

export const AddDomainRequest = type({
  hostname: 'string',
})

export const RedirectStatus = type('301 | 302 | 307 | 308')

export const CustomDomain = type({
  id: 'string',
  organizationId: 'string',
  hostname: 'string',
  readiness: DomainReadiness,
  dnsRecords: DnsRecordInstruction.array(),
  'defaultRedirectStatus?': RedirectStatus,
  createdAt: 'string',
  'activeAt?': 'string',
})

export const LinkStatus = type(
  "'draft' | 'scheduled' | 'active' | 'paused' | 'expired' | 'disabled'",
)

export const UtmParameters = type({
  'source?': 'string',
  'medium?': 'string',
  'campaign?': 'string',
  'term?': 'string',
  'content?': 'string',
})

export const Link = type({
  id: 'string',
  organizationId: 'string',
  domainId: 'string',
  slug: 'string',
  'alias?': 'string',
  'title?': 'string',
  'description?': 'string',
  destinationUrl: 'string.url',
  redirectStatus: RedirectStatus,
  status: LinkStatus,
  'enabled?': 'boolean',
  'activateAt?': 'string',
  'expiresAt?': 'string',
  'maxClicks?': 'number.integer>=1',
  clickCount: 'number.integer>=0',
  'passwordProtected?': 'boolean',
  'expiredDestinationUrl?': 'string.url',
  'fallbackDestinationUrl?': 'string.url',
  'tags?': 'string[]',
  'utm?': UtmParameters,
  'metadata?': type({ '[string]': 'unknown' }),
  createdAt: 'string',
  updatedAt: 'string',
})

export const CreateLinkRequest = type({
  'slug?': /^[A-Za-z0-9_-]+$/,
  destinationUrl: 'string.url',
  'title?': 'string',
  'description?': 'string',
  'redirectStatus?': RedirectStatus,
  'activateAt?': 'string',
  'expiresAt?': 'string',
  'maxClicks?': 'number.integer>=1',
  'password?': 'string>=4',
  'expiredDestinationUrl?': 'string.url',
  'fallbackDestinationUrl?': 'string.url',
  'tags?': 'string[]',
  'utm?': UtmParameters,
  'metadata?': type({ '[string]': 'unknown' }),
})

export const UpdateLinkRequest = type({
  'destinationUrl?': 'string.url',
  'title?': 'string',
  'description?': 'string',
  'redirectStatus?': RedirectStatus,
  'status?': LinkStatus,
  'enabled?': 'boolean',
  'activateAt?': 'string',
  'expiresAt?': 'string',
  'maxClicks?': 'number.integer>=1',
  'password?': 'string>=4',
  'clearPassword?': 'boolean',
  'expiredDestinationUrl?': 'string.url',
  'fallbackDestinationUrl?': 'string.url',
  'tags?': 'string[]',
  'utm?': UtmParameters,
  'metadata?': type({ '[string]': 'unknown' }),
})

export const OrganizationIdPath = type({ organizationId: 'string' })
export const DomainIdPath = type({ organizationId: 'string', domainId: 'string' })
export const LinkIdPath = type({
  organizationId: 'string',
  domainId: 'string',
  linkId: 'string',
})

export const ListOrganizationsResponse = type({
  items: OrganizationMembership.array(),
})

export const ListDomainsResponse = type({
  items: CustomDomain.array(),
})

export const ListLinksResponse = type({
  items: Link.array(),
})

/** OpenAPI 3.x document returned from `GET /openapi.json`. */
export const OpenApiDocument = type({ '[string]': 'unknown' })

export const EmptyResponse = type('undefined')
