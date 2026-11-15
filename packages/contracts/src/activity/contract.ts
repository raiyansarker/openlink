import { type } from 'arktype'

import { oc, openapi } from '../oc'
import { ListActivityQuery, ListActivityResponse, OrganizationIdPath } from './schema'

export const listActivity = oc
  .meta(
    openapi({
      method: 'GET',
      operationId: 'listActivity',
      path: '/organizations/{organizationId}/activity',
      summary: 'Workspace audit feed, newest first',
      inputStructure: 'detailed',
      tags: ['Activity'],
    }),
  )
  .input(type({ params: OrganizationIdPath, query: ListActivityQuery }))
  .output(ListActivityResponse)

export const contract = { listActivity } as const
