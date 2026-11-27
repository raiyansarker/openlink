import type { InferRouterContractInputs, InferRouterContractOutputs } from '@orpc/contract'
import type { contract } from '@openlink/contracts'

export type { HoldPageId, LinkHold, LinkTargeting, SocialPreview } from '@openlink/contracts'

type Outputs = InferRouterContractOutputs<typeof contract>
type Inputs = InferRouterContractInputs<typeof contract>

/** API shapes, straight from the contract. The UI renders these as they are. */
/** A short link. Named `ShortLink` so it never clashes with the `Link` UI components. */
export type ShortLink = Outputs['links']['getWorkspaceLink']
export type LinkStatus = ShortLink['status']
export type UtmParameters = NonNullable<ShortLink['utm']>
export type CreateLinkBody = Inputs['links']['createWorkspaceLink']['body']
export type UpdateLinkBody = Inputs['links']['updateWorkspaceLink']['body']
export type LinkFolder = Outputs['folders']['createFolder']
export type DeleteFolderMode = NonNullable<NonNullable<Inputs['folders']['deleteFolder']['query']>['mode']>
export type LinkHistoryEntry = Outputs['links']['getWorkspaceLinkHistory']['items'][number]
export type LinkHistorySummary = NonNullable<Outputs['links']['getWorkspaceLinkHistory']['summary']>

export type Domain = Outputs['domains']['getDomain']
export type DomainReadiness = Domain['readiness']
export type DnsRecord = Domain['dnsRecords'][number]

export type OrganizationMembership = Outputs['organizations']['listOrganizations']['items'][number]
export type Role = OrganizationMembership['role']
export type AssignableRole = Exclude<Role, 'owner'>
/** A workspace you belong to, with your role in it. */
export type Workspace = OrganizationMembership['organization'] & { role: Role }

export type Member = Outputs['organizations']['listMembers']['items'][number]
export type PendingInvite = Outputs['organizations']['listOrganizationInvites']['items'][number]
export type MyInvite = Outputs['account']['listMyInvites']['items'][number]

export type ApiKey = Outputs['apiKeys']['listApiKeys']['items'][number]
export type DeviceSession = Outputs['account']['listDeviceSessions']['items'][number]

export type ActivityEvent = Outputs['activity']['listActivity']['items'][number]
export type ActivityCategory = ActivityEvent['category']

export type AnalyticsSummary = Outputs['analytics']['getAnalyticsSummary']
export type RecentClick = Outputs['analytics']['listRecentClicks']['items'][number]
