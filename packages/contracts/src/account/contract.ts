import { type } from 'arktype'

import { EmptyResponse } from '../system/schema'
import { oc, openapi } from '../oc'
import { ListDeviceSessionsResponse, RevokeOtherSessionsResponse, SessionIdPath } from './schema'

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

export const contract = { listDeviceSessions, revokeDeviceSession, revokeOtherDeviceSessions } as const
