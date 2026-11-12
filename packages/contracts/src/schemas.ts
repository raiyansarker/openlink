import * as z from 'zod'

export const zHealthStatus = z.enum([
  'ok',
  'degraded',
  'error'
]);

export const zHealthCheckStatus = z.enum([
  'ok',
  'error',
  'skipped'
]);

export const zHealthCheck = z.object({
  name: z.string(),
  status: zHealthCheckStatus,
  required: z.boolean().optional().default(true),
  message: z.string().optional(),
  latencyMs: z.number().gte(0).optional()
});

export const zHealthResponse = z.object({
  status: zHealthStatus,
  service: z.literal('openlink'),
  checkedAt: z.iso.datetime(),
  checks: z.array(zHealthCheck)
});

export const zErrorResponse = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional()
  })
});

export const zSignUpRequest = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

export const zSignInRequest = z.object({
  email: z.email(),
  password: z.string()
});

export const zUser = z.object({
  id: z.string(),
  email: z.email(),
  name: z.string(),
  createdAt: z.iso.datetime()
});

export const zAuthSessionResponse = z.object({
  user: zUser
});

export const zSessionResponse = z.object({
  authenticated: z.boolean(),
  user: zUser.nullish()
});

export const zOrganization = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.iso.datetime()
});

export const zOrganizationRole = z.enum(['admin', 'member']);

export const zOrganizationMembership = z.object({
  organization: zOrganization,
  role: zOrganizationRole,
  joinedAt: z.iso.datetime()
});

export const zCreateOrganizationRequest = z.object({
  name: z.string(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  inviteToken: z.string()
});

export const zCreateOrganizationInviteRequest = z.object({
  email: z.email(),
  role: zOrganizationRole
});

export const zAcceptInviteRequest = z.object({
  token: z.string()
});

export const zOrganizationInvite = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.email(),
  role: zOrganizationRole,
  expiresAt: z.iso.datetime(),
  token: z.string()
});

export const zDomainReadiness = z.enum([
  'pending',
  'verifying',
  'active',
  'failed',
  'removing'
]);

export const zDnsRecordInstruction = z.object({
  type: z.string(),
  host: z.string(),
  value: z.string(),
  purpose: z.enum([
    'routing',
    'ownership',
    'certificate'
  ]),
  status: z.enum([
    'required',
    'verified',
    'failed'
  ]).optional()
});

export const zAddDomainRequest = z.object({
  hostname: z.string()
});

export const zRedirectStatus = z.union([
  z.literal(301),
  z.literal(302),
  z.literal(307),
  z.literal(308)
]);

export const zCustomDomain = z.object({
  id: z.string(),
  organizationId: z.string(),
  hostname: z.string(),
  readiness: zDomainReadiness,
  dnsRecords: z.array(zDnsRecordInstruction),
  defaultRedirectStatus: zRedirectStatus.optional(),
  createdAt: z.iso.datetime(),
  activeAt: z.iso.datetime().optional()
});

export const zLinkStatus = z.enum([
  'draft',
  'scheduled',
  'active',
  'paused',
  'expired',
  'disabled'
]);

export const zUtmParameters = z.object({
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
  term: z.string().optional(),
  content: z.string().optional()
});

export const zLink = z.object({
  id: z.string(),
  organizationId: z.string(),
  domainId: z.string(),
  slug: z.string(),
  alias: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  destinationUrl: z.url(),
  redirectStatus: zRedirectStatus,
  status: zLinkStatus,
  enabled: z.boolean().optional(),
  activateAt: z.iso.datetime().optional(),
  expiresAt: z.iso.datetime().optional(),
  maxClicks: z.int().gte(1).optional(),
  clickCount: z.int().gte(0),
  passwordProtected: z.boolean().optional(),
  expiredDestinationUrl: z.url().optional(),
  fallbackDestinationUrl: z.url().optional(),
  tags: z.array(z.string()).optional(),
  utm: zUtmParameters.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const zCreateLinkRequest = z.object({
  slug: z.string().regex(/^[A-Za-z0-9_-]+$/).optional(),
  destinationUrl: z.url(),
  title: z.string().optional(),
  description: z.string().optional(),
  redirectStatus: zRedirectStatus.optional(),
  activateAt: z.iso.datetime().optional(),
  expiresAt: z.iso.datetime().optional(),
  maxClicks: z.int().gte(1).optional(),
  password: z.string().min(4).optional(),
  expiredDestinationUrl: z.url().optional(),
  fallbackDestinationUrl: z.url().optional(),
  tags: z.array(z.string()).optional(),
  utm: zUtmParameters.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const zUpdateLinkRequest = z.object({
  destinationUrl: z.url().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  redirectStatus: zRedirectStatus.optional(),
  status: zLinkStatus.optional(),
  enabled: z.boolean().optional(),
  activateAt: z.iso.datetime().optional(),
  expiresAt: z.iso.datetime().optional(),
  maxClicks: z.int().gte(1).optional(),
  password: z.string().min(4).optional(),
  clearPassword: z.boolean().optional(),
  expiredDestinationUrl: z.url().optional(),
  fallbackDestinationUrl: z.url().optional(),
  tags: z.array(z.string()).optional(),
  utm: zUtmParameters.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export const zOrganizationId = z.string();

export const zDomainId = z.string();

export const zLinkId = z.string();

/**
 * All required dependencies are healthy
 */
export const zGetHealthResponse = zHealthResponse;

/**
 * OpenAPI 3.1 JSON
 */
export const zGetOpenApiDocumentResponse = z.record(z.string(), z.unknown());

export const zSignUpBody = zSignUpRequest;

/**
 * Account created
 */
export const zSignUpResponse = zAuthSessionResponse;

export const zSignInBody = zSignInRequest;

/**
 * Authenticated session
 */
export const zSignInResponse = zAuthSessionResponse;

/**
 * Signed out
 */
export const zSignOutResponse = z.void();

/**
 * Current session if any
 */
export const zGetSessionResponse = zSessionResponse;

/**
 * Organizations the user belongs to
 */
export const zListOrganizationsResponse = z.object({
  items: z.array(zOrganizationMembership)
});

export const zCreateOrganizationBody = zCreateOrganizationRequest;

/**
 * Organization created
 */
export const zCreateOrganizationResponse = zOrganization;

export const zAcceptOrganizationInviteBody = zAcceptInviteRequest;

/**
 * Invite accepted
 */
export const zAcceptOrganizationInviteResponse = zOrganizationMembership;

export const zGetOrganizationPath = z.object({
  organizationId: z.string()
});

/**
 * Organization
 */
export const zGetOrganizationResponse = zOrganization;

export const zCreateOrganizationInviteBody = zCreateOrganizationInviteRequest;

export const zCreateOrganizationInvitePath = z.object({
  organizationId: z.string()
});

/**
 * Invite created
 */
export const zCreateOrganizationInviteResponse = zOrganizationInvite;

export const zListDomainsPath = z.object({
  organizationId: z.string()
});

/**
 * Custom domains for the organization
 */
export const zListDomainsResponse = z.object({
  items: z.array(zCustomDomain)
});

export const zAddDomainBody = zAddDomainRequest;

export const zAddDomainPath = z.object({
  organizationId: z.string()
});

/**
 * Domain registration started
 */
export const zAddDomainResponse = zCustomDomain;

export const zRemoveDomainPath = z.object({
  organizationId: z.string(),
  domainId: z.string()
});

/**
 * Domain removed
 */
export const zRemoveDomainResponse = z.void();

export const zGetDomainPath = z.object({
  organizationId: z.string(),
  domainId: z.string()
});

/**
 * Domain details and readiness
 */
export const zGetDomainResponse = zCustomDomain;

export const zRefreshDomainStatusPath = z.object({
  organizationId: z.string(),
  domainId: z.string()
});

/**
 * Updated domain status
 */
export const zRefreshDomainStatusResponse = zCustomDomain;

export const zListLinksPath = z.object({
  organizationId: z.string(),
  domainId: z.string()
});

/**
 * Links on this domain
 */
export const zListLinksResponse = z.object({
  items: z.array(zLink)
});

export const zCreateLinkBody = zCreateLinkRequest;

export const zCreateLinkPath = z.object({
  organizationId: z.string(),
  domainId: z.string()
});

/**
 * Link created
 */
export const zCreateLinkResponse = zLink;

export const zDeleteLinkPath = z.object({
  organizationId: z.string(),
  domainId: z.string(),
  linkId: z.string()
});

/**
 * Link deleted
 */
export const zDeleteLinkResponse = z.void();

export const zGetLinkPath = z.object({
  organizationId: z.string(),
  domainId: z.string(),
  linkId: z.string()
});

/**
 * Link
 */
export const zGetLinkResponse = zLink;

export const zUpdateLinkBody = zUpdateLinkRequest;

export const zUpdateLinkPath = z.object({
  organizationId: z.string(),
  domainId: z.string(),
  linkId: z.string()
});

/**
 * Updated link
 */
export const zUpdateLinkResponse = zLink;
