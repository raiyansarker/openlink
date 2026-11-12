import { env } from 'cloudflare:workers'
import type { D1Database, AnalyticsEngineDataset } from '@cloudflare/workers-types'
import type { OpenLinkDomainEnv } from '@openlink/domain'

export type WorkerBindings = OpenLinkDomainEnv & {
  DB: D1Database
  ANALYTICS: AnalyticsEngineDataset
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  BOOTSTRAP_ORG_INVITE_TOKEN?: string
}

export function getBindings(): WorkerBindings {
  return env as WorkerBindings
}
