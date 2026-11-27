import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import { OrganizationMembership } from '../organizations/schema'
import {
  ListDeviceSessionsResponse,
  ListMyInvitesResponse,
  MyInviteIdPath,
  MyInviteLookup,
  MyProfile,
  RevokeOtherSessionsResponse,
  SessionIdPath,
  UpdateMyProfileRequest,
} from './schema'

export const listDeviceSessions = oc
  .meta(openapi({ method: 'GET', operationId: 'listDeviceSessions', path: '/me/sessions', summary: 'Devices you are signed in on', tags: ['Account'] }))
  .output(ListDeviceSessionsResponse)

export const revokeDeviceSession = oc
  .meta(
    openapi({
      method: 'DELETE',
      operationId: 'revokeDeviceSession',
      path: '/me/sessions/{sessionId}',
      successStatus: 204,
      summary: 'Sign out one of your other devices',
      inputStructure: 'detailed',
      tags: ['Account'],
    }),
  )
  .input(type({ params: SessionIdPath }))
  .output(EmptyResponse)

export const revokeOtherDeviceSessions = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'revokeOtherDeviceSessions',
      path: '/me/sessions/revoke-others',
      summary: 'Sign out every device except this one',
      tags: ['Account'],
    }),
  )
  .output(RevokeOtherSessionsResponse)

export const listMyInvites = oc
  .meta(openapi({ method: 'GET', operationId: 'listMyInvites', path: '/me/invites', summary: 'Workspace invites sent to your email', tags: ['Account'] }))
  .output(ListMyInvitesResponse)

export const getMyInvite = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'getMyInvite',
      path: '/me/invites/{inviteId}',
      summary: 'One workspace invite sent to your email',
      inputStructure: 'detailed',
      tags: ['Account'],
    }),
  )
  .input(type({ params: MyInviteIdPath }))
  .output(MyInviteLookup)

export const acceptMyInvite = oc
  .meta(
    openapi({
      method: 'POST',
      operationId: 'acceptMyInvite',
      path: '/me/invites/{inviteId}/accept',
      summary: 'Join the workspace an invite is for',
      inputStructure: 'detailed',
      tags: ['Account'],
    }),
  )
  .input(type({ params: MyInviteIdPath }))
  .output(OrganizationMembership)

export const declineMyInvite = oc
  .meta(
    openapi({
      method: 'DELETE',
      operationId: 'declineMyInvite',
      path: '/me/invites/{inviteId}',
      successStatus: 204,
      summary: 'Turn down a workspace invite',
      inputStructure: 'detailed',
      tags: ['Account'],
    }),
  )
  .input(type({ params: MyInviteIdPath }))
  .output(EmptyResponse)

export const updateMyProfile = oc
  .meta(
    openapi({
      method: 'PATCH',
      operationId: 'updateMyProfile',
      path: '/me',
      summary: 'Change your name or picture',
      inputStructure: 'detailed',
      tags: ['Account'],
    }),
  )
  .input(type({ body: UpdateMyProfileRequest }))
  .output(MyProfile)

export const contract = {
  listDeviceSessions,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
  listMyInvites,
  getMyInvite,
  acceptMyInvite,
  declineMyInvite,
  updateMyProfile,
} as const
