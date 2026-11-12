export type ApiRequestLogEntry = {
  id: string
  occurredAt: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  status: number
}

export const DEMO_API_REQUEST_LOG: ApiRequestLogEntry[] = [
  {
    id: 'req_1',
    occurredAt: '2026-11-12T18:42:10.000Z',
    method: 'POST',
    path: '/api/v1/links',
    status: 201,
  },
  {
    id: 'req_2',
    occurredAt: '2026-11-12T18:41:02.000Z',
    method: 'GET',
    path: '/api/v1/links?page=1',
    status: 200,
  },
  {
    id: 'req_3',
    occurredAt: '2026-11-12T17:55:44.000Z',
    method: 'GET',
    path: '/api/v1/analytics/overview',
    status: 200,
  },
  {
    id: 'req_4',
    occurredAt: '2026-11-12T16:12:08.000Z',
    method: 'PATCH',
    path: '/api/v1/links/lnk_4821',
    status: 200,
  },
  {
    id: 'req_5',
    occurredAt: '2026-11-12T15:03:27.000Z',
    method: 'DELETE',
    path: '/api/v1/links/lnk_1099',
    status: 404,
  },
]
