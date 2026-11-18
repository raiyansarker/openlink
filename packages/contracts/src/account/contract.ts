import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import { OrganizationMembership } from '../organizations/schema'
import {
  ListDeviceSessionsResponse,
  ListMyInvitesResponse,
  MyInviteIdPath,
  MyPicture,
  RevokeOtherSessionsResponse,
  SessionIdPath,
  UpdateMyPictureRequest,
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

export const updateMyPicture = oc
  .meta(
    openapi({
      method: 'PUT',
      operationId: 'updateMyPicture',
      path: '/me/picture',
      summary: 'Replace your profile picture',
      inputStructure: 'detailed',
      tags: ['Account'],
    }),
  )
  .input(type({ body: UpdateMyPictureRequest }))
  .output(MyPicture)

export const removeMyPicture = oc
  .meta(
    openapi({
      method: 'DELETE',
      operationId: 'removeMyPicture',
      path: '/me/picture',
      successStatus: 204,
      summary: 'Remove your profile picture',
      tags: ['Account'],
    }),
  )
  .output(EmptyResponse)

export const contract = {
  listDeviceSessions,
  revokeDeviceSession,
  revokeOtherDeviceSessions,
  listMyInvites,
  acceptMyInvite,
  declineMyInvite,
  updateMyPicture,
  removeMyPicture,
} as const
